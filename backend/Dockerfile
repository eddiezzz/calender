FROM golang:1.21.4-alpine AS builder

WORKDIR /src/calendar-server

# 安装必要的构建工具
RUN apk add --no-cache gcc musl-dev

# 复制 go.mod 和 go.sum
COPY go.mod go.sum* ./

# 安装依赖
RUN go mod download

# 复制源代码
COPY . .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main .

# 最终阶段
FROM alpine:3.18.4

WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/main .

EXPOSE 8081

CMD ["./main"] 