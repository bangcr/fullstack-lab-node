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

// 명령어 실행 함수
const executeCommand = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log(`실행할 명령어: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ 명령어 실행 실패: ${command}`);
        console.error(`오류 메시지: ${error.message}`);
        if (stderr) console.error(`표준 에러: ${stderr}`);
        reject(error);
      } else {
        if (stdout) console.log(`✅ 실행 결과:\n${stdout}`);
        resolve(stdout);
      }
    });
  });
};

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

// GitHub Webhook Secret
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';

// JSON body 파싱
app.use(express.json());

// 상태 확인용 엔드포인트
app.get('/webhook/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Webhook listener is running' });
});

// Webhook 엔드포인트
app.post('/webhook', async (req, res) => {
  console.log("🔹 GitHub Webhook 수신:", new Date().toISOString());

  // Push 이벤트인지 확인
  if (req.body.ref === "refs/heads/main") {
    console.log("🚀 main 브랜치 변경 감지! 업데이트 진행...");

    try {
      const projectDir = process.env.PROJECT_DIR;
      const dockerComposePath = process.platform === 'win32' 
        ? 'docker-compose.exe'
        : '/usr/local/bin/docker-compose';

      // 디렉토리 내용 확인
      console.log('현재 디렉토리 내용 확인:');
      await executeCommand(`ls -la "${projectDir}"`);

      // Git 저장소 상태 확인
      console.log('1. Git 저장소 상태 확인 중...');
      try {
        await executeCommand(`cd "${projectDir}" && git status`);
      } catch (error) {
        console.log('Git 저장소 초기화 중...');
        await executeCommand(`cd "${projectDir}" && git init`);
        await executeCommand(`cd "${projectDir}" && git remote add origin https://github.com/bangcr/fullstack-lab-node.git`);
      }

      // Git 설정
      console.log('2. Git 설정 중...');
      await executeCommand(`cd "${projectDir}" && git config --global user.email "${process.env.GIT_USER_EMAIL}"`);
      await executeCommand(`cd "${projectDir}" && git config --global user.name "${process.env.GIT_USER_NAME}"`);

      // 현재 변경사항 저장
      console.log('3. 현재 변경사항 저장 중...');
      try {
        await executeCommand(`cd "${projectDir}" && git add .`);
        await executeCommand(`cd "${projectDir}" && git stash`);
      } catch (error) {
        console.log('변경사항이 없거나 저장 실패:', error);
      }

      // 원격 저장소에서 변경사항 가져오기
      console.log('4. 원격 저장소에서 변경사항 가져오는 중...');
      await executeCommand(`cd "${projectDir}" && git fetch origin`);
      await executeCommand(`cd "${projectDir}" && git reset --hard origin/main`);

      // 저장했던 변경사항 복원
      console.log('5. 저장했던 변경사항 복원 중...');
      try {
        await executeCommand(`cd "${projectDir}" && git stash pop`);
      } catch (error) {
        console.log('저장된 변경사항이 없거나 복원 실패:', error);
      }

      // Docker 컨테이너 중지
      console.log('6. Docker 컨테이너 중지 중...');
      await executeCommand(`cd "${projectDir}" && "${dockerComposePath}" down`);

      // Docker 컨테이너 재시작
      console.log('7. Docker 컨테이너 재시작 중...');
      await executeCommand(`cd "${projectDir}" && "${dockerComposePath}" up -d --build`);

      console.log('✅ 업데이트 및 재배포 완료!');
    } catch (error) {
      console.error('❌ 업데이트 실패:');
      console.error('에러 타입:', error.constructor.name);
      console.error('에러 메시지:', error.message);
      if (error.stderr) console.error('표준 에러:', error.stderr);
      if (error.stdout) console.error('표준 출력:', error.stdout);
    }
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