FROM nginx:1.24-alpine

# 复制前端文件到nginx的默认目录
COPY src/index.html /usr/share/nginx/html/
COPY src/css /usr/share/nginx/html/css/
COPY src/js /usr/share/nginx/html/js/
COPY src/favicon.ico /usr/share/nginx/html/

# 复制自定义nginx配置
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 