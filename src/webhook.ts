import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';

// .env 파일 경로를 명시적으로 지정
dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();
const port = 9000;

// 환경변수가 없을 경우 에러 발생
if (!process.env.PROJECT_DIR) {
  console.error('❌ PROJECT_DIR 환경변수가 설정되지 않았습니다!');
  process.exit(1);
}

// 디버깅: 현재 작업 디렉토리와 환경변수 출력
console.log('현재 작업 디렉토리:', process.cwd());
console.log('프로젝트 디렉토리 환경변수:', process.env.PROJECT_DIR);

// 디렉토리 존재 여부 확인
try {
  if (fs.existsSync(process.env.PROJECT_DIR)) {
    console.log('✅ 프로젝트 디렉토리가 존재합니다.');
  } else {
    console.log('❌ 프로젝트 디렉토리를 찾을 수 없습니다.');
  }
} catch(err) {
  console.error('디렉토리 확인 중 에러:', err);
}

// GitHub Webhook Secret (보안을 위해 환경변수로 관리하는 것을 권장)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';

// 환경변수 확인용 로그
console.log('프로젝트 디렉토리:', process.env.PROJECT_DIR);

// JSON body 파싱
app.use(express.json());

// 상태 확인용 엔드포인트
app.get('/webhook/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Webhook listener is running' });
});

// Webhook 엔드포인트
app.post('/webhook', (req, res) => {
  console.log("🔹 GitHub Webhook 수신:", new Date().toISOString());

  // Push 이벤트인지 확인
  if (req.body.ref === "refs/heads/main") {
    console.log("🚀 main 브랜치 변경 감지! 업데이트 진행...");

    // Docker Compose 실행 파일 경로
    const dockerComposePath = process.platform === 'win32' 
      ? 'docker-compose.exe'  // Windows
      : '/usr/local/bin/docker-compose';  // Linux/Mac

    // 프로젝트 디렉토리 (호스트 시스템의 경로)
    const projectDir = process.env.PROJECT_DIR;
    
    // 디버깅: 명령어 실행 전 디렉토리 확인
    exec(`ls -la "${projectDir}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('디렉토리 확인 실패:', error);
      } else {
        console.log('디렉토리 내용:', stdout);
      }
    });
    
    // 업데이트 및 재배포 명령어 실행
    const command = `cd "${projectDir}" && git stash && git pull origin main && git stash pop && "${dockerComposePath}" down && "${dockerComposePath}" up --build`;
    
    console.log("실행할 명령어:", command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ 업데이트 실패:`, error);
        console.error(`stderr: ${stderr}`);
      } else {
        console.log("✅ 업데이트 완료:\n", stdout);
      }
    });
  }

  res.sendStatus(200);
});

// 에러 핸들링
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ 에러 발생:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 서버 실행
app.listen(port, () => {
  console.log(`🚀 Webhook 리스너 실행 중: http://localhost:${port}`);
  console.log(`📝 Health check: http://localhost:${port}/webhook/health`);
}); 