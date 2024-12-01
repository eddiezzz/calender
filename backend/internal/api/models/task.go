package models

import (
	"time"
)

type Task struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	Title          string     `json:"title"`
	Completed      bool       `json:"completed"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	TaskDay        time.Time  `json:"task_day"`
	TaskDayTime    string     `json:"task_day_time"`
	IsRecurring    bool       `json:"is_recurring"`
	WeekCount      int        `json:"week_count"`
	OriginalTaskID *uint      `json:"original_task_id,omitempty" gorm:"index"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
