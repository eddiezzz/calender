package main

import (
	"calendar-server/internal/api/config"
	"calendar-server/internal/api/handlers"
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// 自定义日志中间件
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 开始时间
		startTime := time.Now()

		// 处理请求
		c.Next()

		// 结束时间
		endTime := time.Now()

		// 执行时间
		latencyTime := endTime.Sub(startTime)

		// 请求方式
		reqMethod := c.Request.Method

		// 请求路由
		reqUri := c.Request.RequestURI

		// 状态码
		statusCode := c.Writer.Status()

		// 请求IP
		clientIP := c.ClientIP()

		// 日志格式
		log.Printf("| %3d | %13v | %15s | %s | %s |",
			statusCode,
			latencyTime,
			clientIP,
			reqMethod,
			reqUri,
		)
	}
}

func main() {
	// 初始化数据库连接
	err := config.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// 创建Gin路由
	r := gin.Default()

	// 使用自定义Logger中间件
	r.Use(Logger())

	// CORS中间件
	r.Use(func(c *gin.Context) {
		// 在开发环境中允许前端开发服务器访问
		origin := c.Request.Header.Get("Origin")
		if origin == "" {
			origin = "http://localhost:3000" // 默认开发环境地址
		}

		// 设置允许的源
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)

		// 允许的HTTP方法
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")

		// 允许的请求头
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin")

		// 允许发送身份凭证（cookies等）
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		// 允许前端访问的响应头
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type, Authorization")

		// 预检请求缓存时间（1小时）
		c.Writer.Header().Set("Access-Control-Max-Age", "3600")

		// 处理预检请求
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// API路由
	api := r.Group("/api")
	{
		api.POST("/tasks", handlers.CreateTask)
		api.GET("/tasks", handlers.GetTasksByDate)
		api.PUT("/tasks/:id", handlers.UpdateTaskStatus)
		api.DELETE("/tasks/:id", handlers.DeleteTask)
	}

	// 启动服务器
	log.Println("Server starting on :8081...")
	if err := r.Run(":8081"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
