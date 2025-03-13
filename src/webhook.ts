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
    const dockerComposePath = 'docker-compose';  // docker-compose v1 사용

    // 프로젝트 디렉토리 (호스트 시스템의 경로)
    const projectDir = process.env.PROJECT_DIR;
    
    // 환경 변수 확인
    console.log('현재 환경 변수:');
    console.log('PROJECT_DIR:', process.env.PROJECT_DIR);
    console.log('GIT_USER_EMAIL:', process.env.GIT_USER_EMAIL);
    console.log('GIT_USER_NAME:', process.env.GIT_USER_NAME);
    
    // 현재 작업 디렉토리 확인
    exec('pwd', (error, stdout, stderr) => {
      if (error) {
        console.error('현재 디렉토리 확인 실패:', error);
      } else {
        console.log('현재 작업 디렉토리:', stdout);
      }
    });

    // 디렉토리 내용 확인
    exec(`ls -la "${projectDir}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('디렉토리 확인 실패:', error);
      } else {
        console.log('디렉토리 내용:', stdout);
      }
    });

    // 명령어를 개별적으로 실행
    const commands = [
      `cd "${projectDir}"`,
      `git config --global user.email "${process.env.GIT_USER_EMAIL}"`,
      `git config --global user.name "${process.env.GIT_USER_NAME}"`,
      'git stash',
      'git pull origin main',
      'git stash pop || true',  // 실패해도 계속 진행
      `${dockerComposePath} down --remove-orphans`,
      // 컨테이너가 완전히 종료되었는지 확인
      `${dockerComposePath} ps --services | wc -l | grep -q "^0$" || (echo "컨테이너가 아직 실행 중입니다." && exit 1)`,
      `${dockerComposePath} up --build`
    ];

    // 각 명령어를 순차적으로 실행
    let currentCommand = 0;
    const executeNextCommand = () => {
      if (currentCommand >= commands.length) {
        console.log('✅ 모든 명령어 실행 완료!');
        return;
      }

      const command = commands[currentCommand];
      console.log(`실행 중인 명령어 (${currentCommand + 1}/${commands.length}):`, command);

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ 명령어 실행 실패:`, command);
          console.error('오류:', error);
          console.error('stderr:', stderr);
          // docker-compose ps 명령어가 실패하면 3초 후에 재시도
          if (command.includes('docker-compose ps')) {
            console.log('컨테이너 상태 확인 재시도 중...');
            setTimeout(() => {
              executeNextCommand();
            }, 3000);
            return;
          }
        } else {
          console.log(`✅ 명령어 실행 성공:`, command);
          if (stdout) console.log('출력:', stdout);
        }
        
        currentCommand++;
        executeNextCommand();
      });
    };

    executeNextCommand();
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