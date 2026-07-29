"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type Draw = {
  id: number;
  numbers: number[];
};

type FortuneResult = {
  numbers: number[];
  element: string;
  title: string;
  reading: string;
  reasons: string[];
};

const INITIAL_NUMBERS = [3, 12, 19, 28, 34, 41];
const ELEMENTS = [
  { name: "목(木)", label: "성장과 시작", base: [3, 8] },
  { name: "화(火)", label: "열정과 표현", base: [2, 7] },
  { name: "토(土)", label: "균형과 안정", base: [5, 10] },
  { name: "금(金)", label: "결단과 결실", base: [4, 9] },
  { name: "수(水)", label: "지혜와 흐름", base: [1, 6] },
];

function getVisitorId() {
  const key = "haengun-visitor-id";
  const saved = window.localStorage.getItem(key);
  if (saved) return saved;

  const visitorId = window.crypto.randomUUID();
  window.localStorage.setItem(key, visitorId);
  return visitorId;
}

function trackNumberRecommendation(type: "random" | "fortune") {
  window.gtag?.("event", "number_recommendation", {
    recommendation_type: type,
  });
}

function pickNumbers() {
  const pool = Array.from({ length: 45 }, (_, index) => index + 1);

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }

  return pool.slice(0, 6).sort((a, b) => a - b);
}

function getBallClass(number: number) {
  if (number <= 10) return "ball yellow";
  if (number <= 20) return "ball blue";
  if (number <= 30) return "ball red";
  if (number <= 40) return "ball gray";
  return "ball green";
}

function makeFortune(dateValue: string): FortuneResult {
  const digits = dateValue.replace(/\D/g, "").split("").map(Number);
  const seed = digits.reduce((total, digit, index) => total + digit * (index + 1), 0);
  const element = ELEMENTS[seed % ELEMENTS.length];
  const year = Number(dateValue.slice(0, 4));
  const month = Number(dateValue.slice(5, 7));
  const day = Number(dateValue.slice(8, 10));
  const candidates = [
    day,
    month + day,
    year % 45,
    digits.reduce((a, b) => a + b, 0),
    element.base[0] + month,
    element.base[1] + day,
    (year + month + day) % 45,
    (seed * 3) % 45,
  ].map((number) => ((number - 1 + 45) % 45) + 1);

  const unique: number[] = [];
  for (const number of candidates) {
    if (!unique.includes(number)) unique.push(number);
  }
  let cursor = seed;
  while (unique.length < 6) {
    cursor = (cursor * 17 + 11) % 45;
    const number = cursor + 1;
    if (!unique.includes(number)) unique.push(number);
  }

  const numbers = unique.slice(0, 6).sort((a, b) => a - b);
  const dayNumber = ((day - 1) % 45) + 1;

  return {
    numbers,
    element: element.name,
    title: `${element.label}의 기운이 돋보이는 날`,
    reading: `생년월일의 수리 흐름을 오행에 연결해 보면 ${element.name}의 성향이 중심에 있어요. ${element.label}을 상징하는 수를 축으로, 부족한 기운을 보완하는 수를 고르게 섞었습니다.`,
    reasons: numbers.map((number) => {
      if (number === dayNumber) return `${number} · 태어난 날의 수로, 본연의 기운을 상징해요.`;
      if (number === month + day) return `${number} · 태어난 달과 날을 합쳐 관계의 조화를 담았어요.`;
      if (number % 5 === seed % 5) return `${number} · ${element.name}의 흐름과 같은 결을 가진 보완수예요.`;
      return `${number} · 강한 기운이 한쪽으로 치우치지 않도록 균형을 더한 수예요.`;
    }),
  };
}

function NumberBalls({
  numbers,
  revealed = 6,
  compact = false,
}: {
  numbers: number[];
  revealed?: number;
  compact?: boolean;
}) {
  return (
    <div className={`number-row${compact ? " compact" : ""}`}>
      {numbers.map((number, index) => (
        <span
          className={`${getBallClass(number)}${index < revealed ? " visible" : ""}`}
          key={`${number}-${index}`}
          style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}
        >
          {number}
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  const [numbers, setNumbers] = useState(INITIAL_NUMBERS);
  const [revealed, setRevealed] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<Draw[]>([]);
  const [birthDate, setBirthDate] = useState("");
  const [fortune, setFortune] = useState<FortuneResult | null>(null);
  const [fortuneLoading, setFortuneLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const visitorId = getVisitorId();
        const response = await fetch(`/api/draws?visitorId=${encodeURIComponent(visitorId)}`);
        if (!response.ok) return;

        const data = await response.json() as { draws?: Draw[] };
        if (Array.isArray(data.draws)) setHistory(data.draws);
      } catch {
        // Supabase가 설정되지 않은 환경에서도 로컬 추첨 기능은 유지합니다.
      }
    };

    void loadHistory();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const saveDraw = async (drawNumbers: number[], source: "random" | "fortune") => {
    const optimisticDraw = { id: Date.now(), numbers: drawNumbers };
    setHistory((current) => [optimisticDraw, ...current].slice(0, 5));

    try {
      await fetch("/api/draws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: getVisitorId(),
          numbers: drawNumbers,
          source,
        }),
      });
    } catch {
      // 저장 실패 시에도 방금 생성한 번호는 현재 화면에 유지합니다.
    }
  };

  const clearHistory = async () => {
    setHistory([]);
    try {
      await fetch(`/api/draws?visitorId=${encodeURIComponent(getVisitorId())}`, {
        method: "DELETE",
      });
    } catch {
      // 네트워크 오류가 있어도 현재 화면에서는 기록을 비웁니다.
    }
  };

  const draw = () => {
    if (isDrawing) return;

    trackNumberRecommendation("random");
    const next = pickNumbers();
    setNumbers(next);
    setRevealed(0);
    setIsDrawing(true);

    let count = 0;
    timerRef.current = setInterval(() => {
      count += 1;
      setRevealed(count);

      if (count === 6) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsDrawing(false);
        void saveDraw(next, "random");
      }
    }, 190);
  };

  const askFortune = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!birthDate || fortuneLoading) return;

    trackNumberRecommendation("fortune");
    setFortuneLoading(true);
    setFortune(null);
    window.setTimeout(() => {
      const result = makeFortune(birthDate);
      setFortune(result);
      void saveDraw(result.numbers, "fortune");
      setFortuneLoading(false);
    }, 650);
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="행운 번호 홈">
          <span className="brand-symbol" aria-hidden="true">⌁</span>
          <span>행운스테이</span>
        </a>
        <nav aria-label="주요 메뉴">
          <a className="active" href="#top">번호 뽑기</a>
          <a href="#fortune-chat">운세 번호</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="top-badge"><b>추천</b><span>오늘의 행운 번호</span></div>
        <h1>
          설레는 한 주를 위한<br /><em>나만의 행운 번호</em>
        </h1>
        <p className="hero-copy">
          1부터 45까지, 중복 없이 6개의 번호를 골라드려요.
          <br className="desktop-break" /> 가벼운 기대와 함께 오늘의 조합을 만나보세요.
        </p>

        <div className="draw-card" aria-live="polite">
          <div className="card-topline">
            <span>내 행운 번호</span>
            <span className="random-label">LOTTO 6 / 45</span>
          </div>
          <NumberBalls numbers={numbers} revealed={revealed} />
          <div className="divider" />
          <button className="draw-button" onClick={draw} disabled={isDrawing}>
            <span aria-hidden="true">{isDrawing ? "•••" : "✦"}</span>
            {isDrawing ? "행운을 찾는 중..." : "행운 번호 찾기"}
          </button>
          <p className="notice">
            <span aria-hidden="true">ⓘ</span> 생성된 번호는 참고용이며, 당첨을 보장하지 않아요.
          </p>
        </div>
      </section>

      <section className="fortune-section" id="fortune-chat" aria-labelledby="fortune-title">
        <div className="fortune-intro">
          <span className="section-kicker">FORTUNE CHAT</span>
          <h2 id="fortune-title">오늘의 운세 번호</h2>
          <p>생일을 알려주시면 오행의 흐름을 읽고, 나만의 번호와 그 이유를 이야기해드려요.</p>
          <div className="fortune-points">
            <span><b>01</b> 생년월일의 수리 분석</span>
            <span><b>02</b> 오행의 균형 해석</span>
            <span><b>03</b> 행운 번호 6개 추천</span>
          </div>
        </div>

        <div className="chat-card">
          <div className="chat-header">
            <span className="bot-avatar" aria-hidden="true">福</span>
            <div>
              <strong>복담이</strong>
              <small><i /> 운세 번호 상담 중</small>
            </div>
          </div>
          <div className="chat-body" aria-live="polite">
            <div className="message bot-message">
              반가워요. 생년월일을 알려주시면 타고난 오행의 흐름으로 행운 번호를 찾아드릴게요.
            </div>

            {fortuneLoading && (
              <div className="message bot-message typing" aria-label="운세 분석 중">
                <span /><span /><span />
              </div>
            )}

            {fortune && (
              <div className="fortune-result">
                <div className="message user-message">{birthDate} 생이에요.</div>
                <div className="message bot-message result-message">
                  <span className="element-tag">{fortune.element}</span>
                  <strong>{fortune.title}</strong>
                  <p>{fortune.reading}</p>
                  <NumberBalls numbers={fortune.numbers} compact />
                  <ul>
                    {fortune.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <form className="chat-form" onSubmit={askFortune}>
            <label htmlFor="birth-date">생년월일</label>
            <div className="chat-input-row">
              <input
                id="birth-date"
                type="date"
                value={birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setBirthDate(event.target.value)}
                required
              />
              <button type="submit" disabled={!birthDate || fortuneLoading}>
                {fortuneLoading ? "풀이 중" : "번호 보기"}
              </button>
            </div>
          </form>
          <p className="fortune-notice">사주 풀이는 전통 명리의 상징을 활용한 재미용 콘텐츠이며 실제 운세나 당첨을 보장하지 않아요.</p>
        </div>
      </section>

      <section className="history-section" id="recent-luck" aria-labelledby="history-title">
        <div className="history-heading">
          <div>
            <span className="section-kicker">RECENT LUCK</span>
            <h2 id="history-title">최근 뽑은 번호</h2>
          </div>
          {history.length > 0 && (
            <button className="clear-button" onClick={() => void clearHistory()}>
              기록 지우기
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">✦</span>
            <p>아직 뽑은 번호가 없어요.</p>
            <small>첫 행운 번호를 뽑으면 여기에 기록됩니다.</small>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item, index) => (
              <div className="history-item" key={item.id}>
                <span className="history-index">{String(index + 1).padStart(2, "0")}</span>
                <NumberBalls numbers={item.numbers} compact />
              </div>
            ))}
          </div>
        )}
      </section>

      <footer>
        <p>즐거운 기대는 가볍게, 구매는 책임감 있게.</p>
        <span>행운스테이 · GOOD LUCK</span>
      </footer>
    </main>
  );
}
