export interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  category: string
  difficulty: "easy" | "medium" | "hard"
  timeLimit: number
  points: number
}

export interface QuizCategory {
  id: string
  name: string
  description: string
  questions: QuizQuestion[]
}

// Mock quiz database - in real app this would come from Supabase
export const quizCategories: QuizCategory[] = [
  {
    id: "general",
    name: "General Knowledge",
    description: "Mixed topics for everyone",
    questions: [
      {
        id: 1,
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: 2,
        category: "Geography",
        difficulty: "easy",
        timeLimit: 60,
        points: 100,
      },
      {
        id: 2,
        question: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        correctAnswer: 1,
        category: "Science",
        difficulty: "easy",
        timeLimit: 60,
        points: 100,
      },
      {
        id: 3,
        question: "Who painted the Mona Lisa?",
        options: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"],
        correctAnswer: 1,
        category: "Art",
        difficulty: "medium",
        timeLimit: 60,
        points: 150,
      },
      {
        id: 4,
        question: "What is the largest mammal in the world?",
        options: ["African Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
        correctAnswer: 1,
        category: "Nature",
        difficulty: "easy",
        timeLimit: 60,
        points: 100,
      },
      {
        id: 5,
        question: "In which year did World War II end?",
        options: ["1944", "1945", "1946", "1947"],
        correctAnswer: 1,
        category: "History",
        difficulty: "medium",
        timeLimit: 60,
        points: 150,
      },
      {
        id: 6,
        question: "What is the chemical symbol for gold?",
        options: ["Go", "Gd", "Au", "Ag"],
        correctAnswer: 2,
        category: "Science",
        difficulty: "medium",
        timeLimit: 60,
        points: 150,
      },
      {
        id: 7,
        question: "Which country has the most natural lakes?",
        options: ["Canada", "Russia", "USA", "Finland"],
        correctAnswer: 0,
        category: "Geography",
        difficulty: "hard",
        timeLimit: 60,
        points: 200,
      },
      {
        id: 8,
        question: "What is the smallest prime number?",
        options: ["0", "1", "2", "3"],
        correctAnswer: 2,
        category: "Mathematics",
        difficulty: "easy",
        timeLimit: 60,
        points: 100,
      },
      {
        id: 9,
        question: "Who wrote 'Romeo and Juliet'?",
        options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
        correctAnswer: 1,
        category: "Literature",
        difficulty: "easy",
        timeLimit: 60,
        points: 100,
      },
      {
        id: 10,
        question: "What is the hardest natural substance on Earth?",
        options: ["Gold", "Iron", "Diamond", "Platinum"],
        correctAnswer: 2,
        category: "Science",
        difficulty: "medium",
        timeLimit: 60,
        points: 150,
      },
    ],
  },
  {
    id: "science",
    name: "Science & Tech",
    description: "For the tech-savvy racers",
    questions: [
      {
        id: 11,
        question: "What does CPU stand for?",
        options: [
          "Central Processing Unit",
          "Computer Personal Unit",
          "Central Program Unit",
          "Computer Processing Unit",
        ],
        correctAnswer: 0,
        category: "Technology",
        difficulty: "easy",
        timeLimit: 60,
        points: 100,
      },
      {
        id: 12,
        question: "What is the speed of light in vacuum?",
        options: ["299,792,458 m/s", "300,000,000 m/s", "299,000,000 m/s", "298,792,458 m/s"],
        correctAnswer: 0,
        category: "Physics",
        difficulty: "hard",
        timeLimit: 60,
        points: 200,
      },
      {
        id: 13,
        question: "Which programming language was created by Guido van Rossum?",
        options: ["Java", "Python", "C++", "JavaScript"],
        correctAnswer: 1,
        category: "Programming",
        difficulty: "medium",
        timeLimit: 60,
        points: 150,
      },
      {
        id: 14,
        question: "What is the atomic number of carbon?",
        options: ["4", "6", "8", "12"],
        correctAnswer: 1,
        category: "Chemistry",
        difficulty: "medium",
        timeLimit: 60,
        points: 150,
      },
      {
        id: 15,
        question: "Which company developed the first iPhone?",
        options: ["Samsung", "Google", "Apple", "Microsoft"],
        correctAnswer: 2,
        category: "Technology",
        difficulty: "easy",
        timeLimit: 60,
        points: 100,
      },
    ],
  },
  {
    id: "sports",
    name: "Sports",
    description: "Athletic knowledge challenge",
    questions: [
      {
        id: 16,
        question: "How many players are on a basketball team on the court at one time?",
        options: ["4", "5", "6", "7"],
        correctAnswer: 1,
        category: "Basketball",
        difficulty: "easy",
        timeLimit: 60,
        points: 100,
      },
      {
        id: 17,
        question: "In which sport would you perform a slam dunk?",
        options: ["Tennis", "Basketball", "Volleyball", "Baseball"],
        correctAnswer: 1,
        category: "Basketball",
        difficulty: "easy",
        timeLimit: 60,
        points: 100,
      },
      {
        id: 18,
        question: "How often are the Summer Olympic Games held?",
        options: ["Every 2 years", "Every 3 years", "Every 4 years", "Every 5 years"],
        correctAnswer: 2,
        category: "Olympics",
        difficulty: "easy",
        timeLimit: 60,
        points: 100,
      },
      {
        id: 19,
        question: "What is the maximum score possible in ten-pin bowling?",
        options: ["200", "250", "300", "350"],
        correctAnswer: 2,
        category: "Bowling",
        difficulty: "medium",
        timeLimit: 60,
        points: 150,
      },
      {
        id: 20,
        question: "Which country has won the most FIFA World Cups?",
        options: ["Germany", "Argentina", "Brazil", "Italy"],
        correctAnswer: 2,
        category: "Soccer",
        difficulty: "medium",
        timeLimit: 60,
        points: 150,
      },
    ],
  },
]

export function getQuizByCategory(categoryId: string): QuizCategory | undefined {
  return quizCategories.find((category) => category.id === categoryId)
}

export function getRandomQuestions(categoryId: string, count: number): QuizQuestion[] {
  const category = getQuizByCategory(categoryId)
  if (!category) return []

  const shuffled = [...category.questions].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function calculateScore(timeRemaining: number, difficulty: "easy" | "medium" | "hard"): number {
  const basePoints = {
    easy: 100,
    medium: 150,
    hard: 200,
  }

  const timeBonus = Math.max(0, Math.floor(timeRemaining * 2))
  return basePoints[difficulty] + timeBonus
}
