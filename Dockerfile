# Node.js 애플리케이션을 위한 Dockerfile

# Node.js 18-alpine 버전을 기반 이미지로 사용
# 이 이미지에는 Node.js와 npm이 미리 설치되어 있음
FROM node:18-alpine

# 애플리케이션 코드가 위치할 작업 디렉토리 생성
# 이후의 모든 명령어는 이 디렉토리를 기준으로 실행됨
WORKDIR /app

# 필요한 패키지 설치
RUN apk add --no-cache git docker-compose

# 소스 코드 복사
COPY . .

# 의존성 설치
RUN yarn install

# TypeScript 컴파일
RUN yarn build

# 애플리케이션이 사용할 포트를 명시
# 이는 문서화 목적이며, 실제 포트 개방은 docker-compose.yml에서 설정
EXPOSE 9000

# 컨테이너가 시작될 때 실행할 명령어
# 컴파일된 JavaScript 코드를 실행
CMD ["node", "dist/webhook.js"]
