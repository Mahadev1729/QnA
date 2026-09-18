import React from 'react';
import { Compass, Code, Lightbulb, GraduationCap } from 'lucide-react';

const STARTER_PROMPTS = [
  {
    icon: Compass,
    title: 'Explore live web facts',
    prompt: 'What are the top AI breakthroughs and tech releases this week?',
    desc: 'Uses real-time Google search for fresh data',
  },
  {
    icon: Code,
    title: 'Write Python & FastAPI',
    prompt: 'How to build high-performance async streaming APIs in FastAPI?',
    desc: 'Code snippets & architectural patterns',
  },
  {
    icon: GraduationCap,
    title: 'Explain complex concepts',
    prompt: 'Explain the Transformer attention mechanism with an intuitive mental model.',
    desc: 'Clear mental model with key takeaways',
  },
  {
    icon: Lightbulb,
    title: 'Brainstorm creative ideas',
    prompt: 'Suggest 3 unique SaaS ideas leveraging real-time AI reasoning.',
    desc: 'Actionable blueprints and market angles',
  },
];

export default function WelcomeScreen({ handleSendMessage }) {
  return (
    <div className="welcome-container">
      <h1 className="welcome-heading-chatgpt">What can I help with today?</h1>

      <div className="prompt-suggestions-row">
        {STARTER_PROMPTS.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className="prompt-pill-card"
              onClick={() => handleSendMessage(item.prompt)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Icon size={16} color="var(--primary)" />
                  <span className="prompt-pill-title">{item.title}</span>
                </div>
                <div className="prompt-pill-desc">{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
