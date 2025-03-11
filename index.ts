// 환경 변수를 사용하기 위한 dotenv 설정
// .env 파일의 내용을 process.env로 불러옵니다.
import dotenv from "dotenv";

// Express 웹 프레임워크와 필요한 타입들을 가져옵니다.
import express, { Request, Response } from "express";

// MySQL 데이터베이스 연결을 위한 mysql2 패키지와 타입을 가져옵니다.
import mysql, { Connection } from "mysql2";

// CORS(Cross-Origin Resource Sharing) 미들웨어를 가져옵니다.
// 다른 도메인에서의 API 요청을 허용하기 위해 사용됩니다.
import cors from "cors";

// .env 파일의 환경 변수들을 불러옵니다.
dotenv.config();

// Express 애플리케이션 인스턴스를 생성합니다.
const app = express();

// JSON 형식의 요청 본문을 파싱하기 위한 미들웨어를 설정합니다.
app.use(express.json());

// 모든 도메인에서의 요청을 허용하는 CORS 설정을 추가합니다.
app.use(cors());

// MySQL 데이터베이스 연결 설정
// 환경 변수가 없을 경우 기본값을 사용합니다.
const db: Connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",     // 데이터베이스 호스트
  user: process.env.DB_USER || "root",         // 데이터베이스 사용자
  password: process.env.DB_PASSWORD || "root", // 데이터베이스 비밀번호
  database: process.env.DB_NAME || "mydb",    // 사용할 데이터베이스 이름
});

// 데이터베이스 연결을 시도합니다.
db.connect((err: Error | null) => {
  if (err) console.error("DB 연결 실패:", err);  // 연결 실패 시 에러 출력
  else console.log("✅ MySQL 연결 성공");       // 연결 성공 시 메시지 출력
});

// 루트 경로("/")에 대한 GET 요청 처리
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Express!");  // 간단한 응답 메시지 전송
});

// 서버를 5000번 포트에서 실행합니다.
app.listen(5000, () => {
  console.log("🚀 Express 서버가 5000번 포트에서 실행 중");
});
