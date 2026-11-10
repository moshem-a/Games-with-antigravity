FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY MEDIUM_ARTICLE.html /usr/share/nginx/html/docs/index.html
COPY MEDIUM_ARTICLE.html /usr/share/nginx/html/MEDIUM_ARTICLE.html
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY public /usr/share/nginx/html/public

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
