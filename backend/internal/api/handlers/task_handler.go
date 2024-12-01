package handlers

import (
	"calendar-server/internal/api/config"
	"calendar-server/internal/api/models"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// CreateTask 创建任务
func CreateTask(c *gin.Context) {
	var input struct {
		Title       string `json:"title" binding:"required"`
		TaskDay     string `json:"task_day" binding:"required"` // 对于周期性任务，这是开始日期
		TaskDayTime string `json:"task_day_time" binding:"required"`
		IsRecurring bool   `json:"is_recurring"`
		WeekCount   int    `json:"week_count"`
		Weekday     int    `json:"weekday,omitempty"` // 0-6 表示周日到周六
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 打印输入数据
	log.Printf("Received input: %+v\n", input)

	// 解析日期
	startDay, err := time.Parse("2006-01-02", input.TaskDay)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format"})
		return
	}

	// 如果是周期性任务但没有指定周数，默认设置为4周
	if input.IsRecurring && input.WeekCount <= 0 {
		input.WeekCount = 4
	}

	// 对于周期性任务，确保开始日期是正确的星期几
	if input.IsRecurring {
		currentWeekday := int(startDay.Weekday())
		if input.Weekday != currentWeekday {
			// 计算到目标星期几需要添加的天数
			daysToAdd := (input.Weekday - currentWeekday + 7) % 7
			startDay = startDay.AddDate(0, 0, daysToAdd)
		}
	}

	// 创建原始任务
	originalTask := models.Task{
		Title:       input.Title,
		TaskDay:     startDay,
		TaskDayTime: input.TaskDayTime,
		IsRecurring: input.IsRecurring,
		WeekCount:   input.WeekCount,
	}

	// 保存原始任务
	if err := config.DB.Create(&originalTask).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 打印创建的原始任务
	log.Printf("Created original task: %+v\n", originalTask)

	// 如果是周期性任务，创建后续任务实例
	if input.IsRecurring && input.WeekCount > 1 {
		tasks := make([]models.Task, 0, input.WeekCount-1) // 预分配容量
		// 从第2周开始创建（因为第1周是原始任务）
		for i := 1; i < input.WeekCount; i++ {
			newTask := models.Task{
				Title:          input.Title,
				TaskDay:        startDay.AddDate(0, 0, i*7), // 每次加7天
				TaskDayTime:    input.TaskDayTime,
				IsRecurring:    true,
				WeekCount:      input.WeekCount,
				OriginalTaskID: &originalTask.ID, // 关联到原始任务
			}
			tasks = append(tasks, newTask)
		}

		// 只有在有后续任务时才进行批量创建
		if len(tasks) > 0 {
			if err := config.DB.Create(&tasks).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			// 打印创建的任务集合
			log.Printf("Created recurring tasks: %+v\n", tasks)

			// 返回所有任务（包括原始任务）
			tasks = append([]models.Task{originalTask}, tasks...)
			c.JSON(http.StatusCreated, gin.H{
				"tasks":        tasks,
				"weekday":      input.Weekday,
				"weekday_name": []string{"周日", "周一", "周二", "周三", "周四", "周五", "周六"}[input.Weekday],
				"start_date":   startDay.Format("2006-01-02"),
			})
			return
		}
	}

	// 返回单个任务（非周期性任务或只有一周的周期性任务）
	c.JSON(http.StatusCreated, originalTask)
}

// GetTasksByDate 获取指定日期的任务
func GetTasksByDate(c *gin.Context) {
	date := c.Query("date")
	if date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date parameter is required"})
		return
	}

	parsedDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format"})
		return
	}

	var tasks []models.Task
	// 获取指定日期的所有任务（包括周期性和非周期性）
	if err := config.DB.Where("task_day = ?", parsedDate).Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 为每个周期性任务添加额外信息
	var response []map[string]interface{}
	for _, task := range tasks {
		taskInfo := map[string]interface{}{
			"id":            task.ID,
			"title":         task.Title,
			"completed":     task.Completed,
			"completed_at":  task.CompletedAt,
			"task_day":      task.TaskDay,
			"task_day_time": task.TaskDayTime,
			"is_recurring":  task.IsRecurring,
			"week_count":    task.WeekCount,
		}

		if task.IsRecurring {
			weekday := task.TaskDay.Weekday()
			taskInfo["weekday"] = int(weekday)
			taskInfo["weekday_name"] = []string{"周日", "周一", "周二", "周三", "周四", "周五", "周六"}[weekday]
		}

		response = append(response, taskInfo)
	}

	c.JSON(http.StatusOK, response)
}

// UpdateTaskStatus 更新任务状态
func UpdateTaskStatus(c *gin.Context) {
	id := c.Param("id")
	taskID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	var task models.Task
	if err := config.DB.First(&task, taskID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	var updateData struct {
		Completed bool `json:"completed"`
	}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 更新完成状态和完成时间
	updates := map[string]interface{}{
		"completed": updateData.Completed,
	}
	if updateData.Completed {
		now := time.Now()
		updates["completed_at"] = &now
	} else {
		updates["completed_at"] = nil
	}

	if err := config.DB.Model(&task).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, task)
}

// DeleteTask 删除任务
func DeleteTask(c *gin.Context) {
	id := c.Param("id")
	taskID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	if err := config.DB.Delete(&models.Task{}, taskID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
}
