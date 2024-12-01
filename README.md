# 个人日历任务管理系统

一个基于Docker的全栈日历任务管理系统，包含前端界面和后端API。

## 项目结构

```
calendar/
├── frontend/                # 前端项目
│   ├── src/                # 源代码
│   │   ├── index.html     # 主页面
│   │   ├── css/          # 样式文件
│   │   └── js/           # JavaScript文件
│   ├── nginx/             # Nginx配置
│   └── Dockerfile         # 前端Docker配置
│
├── backend/                # 后端项目
│   ├── api/               # Go API服务
│   │   ├── config/       # 配置文件
│   │   ├── handlers/     # 请求处理器
│   │   └── models/       # 数据模型
│   ├── scripts/           # 数据库脚本
│   └── Dockerfile         # 后端Docker配置
│
├── docker-compose.yml      # Docker编排配置
└── README.md              # 项目说明文件
```

## 功能特点

- 日历显示和导航
- 任务添加、完成和删除
- 实时时钟显示
- 任务完成时间记录
- 数据持���化存储

## 技术栈

- 前端：HTML5, CSS3, JavaScript
- 后端：Go (Gin框架)
- 数据库：MySQL 8.0
- 服务器：Nginx
- 容器化：Docker

## 快速开始

1. 克隆项目：
   ```bash
   git clone [项目地址]
   cd calendar
   ```

2. 启动服务：
   ```bash
   docker-compose up --build
   ```

3. 访问应用：
   打开浏览器访问 `http://localhost`

## 开发说明

### 前端开发
- 所有前端代码位于 `frontend/src` 目录
- 修改后需要重新构建Docker镜像

### 后端开发
- Go API代码位于 `backend/api` 目录
- 数据库脚本位于 `backend/scripts` 目录

### 配置修改
- 数据库配置：修改 `docker-compose.yml` 中的环境变量
- Nginx配置：修改 `frontend/nginx/nginx.conf`

## 数据持久化

- MySQL数据存储在Docker卷 `mysql-data` 中
- 可以通过以下命令备份数据：
  ```bash
  docker-compose exec db mysqldump -u root -p calendar > backup.sql
  ```

## 注意事项

1. 确保Docker和Docker Compose已安装
2. 默认端口：
   - 前端：80
   - 后端：8080（内部）
   - MySQL：3306（内部）
3. 首次启动可能需要等待MySQL初始化完成

## 许可证

MIT License 