"use client";

import { useEffect, useRef, useState } from "react";

type Draw = {
  id: number;
  numbers: number[];
};

const INITIAL_NUMBERS = [3, 12, 19, 28, 34, 41];

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
  const [drawCount, setDrawCount] = useState(1);
  const [history, setHistory] = useState<Draw[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const draw = () => {
    if (isDrawing) return;

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
        setHistory((current) => [
          { id: Date.now(), numbers: next },
          ...current,
        ].slice(0, 5));
      }
    }, 190);
  };

  const drawMany = () => {
    if (isDrawing) return;

    const amount = Math.min(drawCount, 5);
    const draws = Array.from({ length: amount }, (_, index) => ({
      id: Date.now() + index,
      numbers: pickNumbers(),
    }));

    setNumbers(draws[0].numbers);
    setRevealed(6);
    setHistory((current) => [...draws, ...current].slice(0, 5));
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="행운 번호 홈">
          <span className="brand-mark" aria-hidden="true">🍀</span>
          <span>행운 번호</span>
        </a>
        <span className="header-note">
          <span aria-hidden="true">✦</span> 오늘의 행운을 가볍게
        </span>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>●</span> LOTTO 6/45</div>
        <h1>
          이번 주 행운의 번호,
          <br />
          <em>지금 뽑아볼까요?</em>
        </h1>
        <p className="hero-copy">
          1부터 45까지, 중복 없이 6개의 번호를 골라드려요.
          <br className="desktop-break" /> 좋은 예감과 함께 시작해보세요.
        </p>

        <div className="draw-card" aria-live="polite">
          <div className="card-topline">
            <span>나의 행운 번호</span>
            <span className="random-label">RANDOM PICK</span>
          </div>
          <NumberBalls numbers={numbers} revealed={revealed} />
          <div className="divider" />
          <button className="draw-button" onClick={draw} disabled={isDrawing}>
            <span aria-hidden="true">{isDrawing ? "•••" : "✦"}</span>
            {isDrawing ? "행운을 찾는 중..." : "행운 번호 뽑기"}
          </button>
          <p className="notice">
            <span aria-hidden="true">ⓘ</span> 생성된 번호는 참고용이며, 당첨을 보장하지 않아요.
          </p>
        </div>
      </section>

      <section className="multi-section" aria-labelledby="multi-title">
        <div>
          <span className="section-kicker">QUICK PICKS</span>
          <h2 id="multi-title">여러 조합이 필요하신가요?</h2>
          <p>최대 5개까지 한 번에 새로운 조합을 만들 수 있어요.</p>
        </div>
        <div className="quick-control">
          <label htmlFor="draw-count">조합 수</label>
          <div className="stepper">
            <button
              onClick={() => setDrawCount((count) => Math.max(1, count - 1))}
              aria-label="조합 수 줄이기"
            >
              −
            </button>
            <output id="draw-count">{drawCount}</output>
            <button
              onClick={() => setDrawCount((count) => Math.min(5, count + 1))}
              aria-label="조합 수 늘리기"
            >
              +
            </button>
          </div>
          <button className="multi-button" onClick={drawMany} disabled={isDrawing}>
            {drawCount}개 조합 만들기 <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section className="history-section" aria-labelledby="history-title">
        <div className="history-heading">
          <div>
            <span className="section-kicker">RECENT LUCK</span>
            <h2 id="history-title">최근 뽑은 번호</h2>
          </div>
          {history.length > 0 && (
            <button className="clear-button" onClick={() => setHistory([])}>
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
        <span>GOOD LUCK · 행운 번호</span>
      </footer>
    </main>
  );
}
