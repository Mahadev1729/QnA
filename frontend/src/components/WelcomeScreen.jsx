import React from 'react';
import { Sparkles, Compass, Code, Zap } from 'lucide-react';

const STARTER_PROMPTS = [
  {
    icon: Compass,
    title: 'Live Web Search',
    prompt: 'What are the top AI releases and technology updates this week?',
  },
  {
    icon: Code,
    title: 'Code Architecture',
    prompt: 'How to build high-performance async streaming APIs in FastAPI?',
  },
  {
    icon: Zap,
    title: 'Deep Concept',
    prompt: 'Explain the Transformer attention mechanism with an intuitive mental model.',
  },
  {
    icon: Sparkles,
    title: 'Product Ideas',
    prompt: 'Suggest 3 creative ways to use generative AI for developer productivity.',
  },
];

export default function WelcomeScreen({ handleSendMessage }) {
  return (
    <div className="welcome-container">
      <div className="welcome-icon-glow">
        <Sparkles size={22} color="#fff" />
      </div>
      <h1 className="welcome-heading">Where curiosity meets clarity.</h1>
      <p className="welcome-desc">
        Instant reasoning powered by Groq, with live Google web search whenever freshness matters.
      </p>

      <div className="suggestion-grid">
        {STARTER_PROMPTS.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="suggestion-card"
              onClick={() => handleSendMessage(item.prompt)}
            >
              <div className="suggestion-card-title">
                <Icon size={14} color="var(--primary)" />
                <span>{item.title}</span>
              </div>
              <div className="suggestion-card-prompt">{item.prompt}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
