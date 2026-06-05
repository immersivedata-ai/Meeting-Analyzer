import type { AnalysisResults } from '@/types/analysis'

export type { AnalysisResults }

export const sampleAnalysisResults: AnalysisResults = {
  transcript: [
    {
      id: "1",
      speaker: "John Smith",
      text: "Good morning everyone, let's start today's project review meeting. We need to discuss the Q4 deliverables and timeline.",
      start_time: 0,
      end_time: 8,
      confidence: 0.95
    },
    {
      id: "2", 
      speaker: "Sarah Johnson",
      text: "Thanks John. I've completed the user research phase and we have some key insights to share with the team.",
      start_time: 8,
      end_time: 15,
      confidence: 0.92
    },
    {
      id: "3",
      speaker: "Mike Chen",
      text: "Great work Sarah. From the development side, we're on track with the new feature implementation.",
      start_time: 15,
      end_time: 22,
      confidence: 0.89
    }
  ],
  summary: "Team meeting focused on Q4 project deliverables and timeline review. Sarah completed user research with valuable insights, while Mike confirmed development is on track for new feature implementation. The team discussed priority items and assigned next steps to ensure project success.",
  action_items: [
    {
      id: "1",
      text: "Complete user interface mockups by Friday",
      assignee: "Sarah Johnson",
      deadline: "2024-12-20",
      priority: "high",
      confidence: 0.94
    },
    {
      id: "2",
      text: "Review and approve final design specifications",
      assignee: "John Smith",
      deadline: "2024-12-22",
      priority: "medium",
      confidence: 0.87
    },
    {
      id: "3",
      text: "Set up development environment for new features",
      assignee: "Mike Chen",
      deadline: "2024-12-18",
      priority: "high",
      confidence: 0.91
    }
  ],
  key_decisions: [
    {
      id: "1",
      decision: "Adopt mobile-first design approach for better user experience",
      rationale: "User research shows 70% of users access the platform via mobile devices",
      impact: "high",
      confidence: 0.96
    },
    {
      id: "2",
      decision: "Extend project timeline by one week to ensure quality",
      rationale: "Additional time needed for thorough testing and user feedback integration",
      impact: "medium",
      confidence: 0.88
    }
  ],
  processing_time: 45
};

export const generateRandomResults = (): AnalysisResults => {
  return {
    transcript: [
      {
        id: "1",
        speaker: "Alex Rodriguez",
        text: "Let's begin our quarterly business review. We need to analyze our performance metrics and plan for next quarter.",
        start_time: 0,
        end_time: 7,
        confidence: 0.93
      },
      {
        id: "2",
        speaker: "Emma Wilson",
        text: "Our customer acquisition rate increased by 25% this quarter, which exceeds our initial projections.",
        start_time: 7,
        end_time: 14,
        confidence: 0.96
      }
    ],
    summary: "Quarterly business review meeting covering performance metrics and strategic planning. Customer acquisition exceeded projections with 25% growth. Team discussed resource allocation and identified key opportunities for next quarter growth.",
    action_items: [
      {
        id: "1",
        text: "Prepare comprehensive quarterly report for stakeholders",
        assignee: "Alex Rodriguez",
        deadline: "2024-12-25",
        priority: "high",
        confidence: 0.91
      },
      {
        id: "2",
        text: "Schedule customer feedback sessions for product improvements",
        assignee: "Emma Wilson",
        deadline: "2024-12-30",
        priority: "medium",
        confidence: 0.85
      }
    ],
    key_decisions: [
      {
        id: "1",
        decision: "Increase marketing budget by 15% for next quarter",
        rationale: "Strong ROI demonstrated in current quarter justifies additional investment",
        impact: "high",
        confidence: 0.94
      },
      {
        id: "2",
        decision: "Implement new customer onboarding process",
        rationale: "Current process has bottlenecks affecting user experience and conversion rates",
        impact: "medium",
        confidence: 0.89
      }
    ],
    processing_time: Math.random() * 60 + 20
  };
};
