import { users, sessions, questions, type User, type InsertUser, type Session, type InsertSession, type Question, type InsertQuestion } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  
  // Question methods
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestionsBySession(sessionId: string): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  updateQuestion(id: number, updates: Partial<Question>): Promise<Question | undefined>;
  deleteQuestion(id: number): Promise<void>;
  updateQuestionOrder(sessionId: string, questionOrders: { id: number; order: number }[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<string, Session>;
  private questions: Map<number, Question>;
  private currentUserId: number;
  private currentQuestionId: number;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.questions = new Map();
    this.currentUserId = 1;
    this.currentQuestionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const session: Session = {
      ...insertSession,
      isActive: insertSession.isActive ?? true,
      participantCount: 0,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = this.currentQuestionId++;
    const existingQuestions = Array.from(this.questions.values())
      .filter(q => q.sessionId === insertQuestion.sessionId);
    const maxOrder = existingQuestions.length > 0 
      ? Math.max(...existingQuestions.map(q => q.order)) 
      : 0;
    
    const question: Question = {
      ...insertQuestion,
      id,
      participantName: insertQuestion.participantName ?? null,
      order: maxOrder + 1,
      status: "queued",
    };
    this.questions.set(id, question);
    return question;
  }

  async getQuestionsBySession(sessionId: string): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter(q => q.sessionId === sessionId)
      .sort((a, b) => a.order - b.order);
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async updateQuestion(id: number, updates: Partial<Question>): Promise<Question | undefined> {
    const question = this.questions.get(id);
    if (!question) return undefined;
    
    const updatedQuestion = { ...question, ...updates };
    this.questions.set(id, updatedQuestion);
    return updatedQuestion;
  }

  async deleteQuestion(id: number): Promise<void> {
    this.questions.delete(id);
  }

  async updateQuestionOrder(sessionId: string, questionOrders: { id: number; order: number }[]): Promise<void> {
    for (const { id, order } of questionOrders) {
      const question = this.questions.get(id);
      if (question && question.sessionId === sessionId) {
        this.questions.set(id, { ...question, order });
      }
    }
  }
}

export const storage = new MemStorage();
