import express from 'express';
import { exec } from 'child_process';
import path from 'path';

const app = express();
const port = 9000;

// GitHub Webhook Secret (보안을 위해 환경변수로 관리하는 것을 권장)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';

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

    // 프로젝트 디렉토리로 이동
    const projectDir = path.resolve(__dirname, '..');
    
    // 업데이트 및 재배포 명령어 실행
    exec(`cd ${projectDir} && git pull origin main && docker-compose down && docker-compose up -d --build`, 
      (error, stdout, stderr) => {
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