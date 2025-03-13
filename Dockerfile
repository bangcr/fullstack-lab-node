# Node.js 애플리케이션을 위한 Dockerfile

# Node.js 16 버전을 기반 이미지로 사용
# 이 이미지에는 Node.js와 npm이 미리 설치되어 있음
FROM node:16

# 애플리케이션 코드가 위치할 작업 디렉토리 생성
# 이후의 모든 명령어는 이 디렉토리를 기준으로 실행됨
WORKDIR /app

# Docker CLI 및 docker-compose 설치
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Docker의 공식 GPG 키 추가
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker 저장소 설정
RUN echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker CLI 및 docker-compose 설치
RUN apt-get update && apt-get install -y docker-ce-cli docker-compose-plugin

# docker-compose 명령어를 사용할 수 있도록 심볼릭 링크 생성
RUN ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

# package.json과 package-lock.json (또는 yarn.lock) 파일을 복사
# 종속성 설치를 위해 필요한 파일만 먼저 복사
COPY package*.json ./

# npm을 사용하여 프로젝트 종속성 설치
# 프로덕션 환경을 위한 모든 필요한 패키지가 설치됨
RUN npm install

# wait-for-it.sh 스크립트 설치
# 이 스크립트는 데이터베이스가 준비될 때까지 기다리는 데 사용됨
RUN apt-get update && apt-get install -y curl
RUN curl -o /usr/local/bin/wait-for-it.sh https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# TypeScript 설정 파일 복사
# TypeScript 컴파일을 위해 필요한 설정 파일
COPY tsconfig.json ./

# 나머지 애플리케이션 소스 코드를 복사
# .dockerignore 파일에 명시된 파일/디렉토리는 제외됨
COPY . .

# TypeScript 코드를 JavaScript로 컴파일
RUN npm run build

# 애플리케이션이 사용할 포트를 명시
# 이는 문서화 목적이며, 실제 포트 개방은 docker-compose.yml에서 설정
EXPOSE 5000

# 컨테이너가 시작될 때 실행할 명령어
# 컴파일된 JavaScript 코드를 실행
CMD ["npm", "start"]
