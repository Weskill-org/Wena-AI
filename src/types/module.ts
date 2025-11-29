export interface Module {
  id: string;
  title: string;
  description: string | null;
  credit_cost: number;
  order_index: number;
  created_at: string;
}

export interface Chapter {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  order_index: number;
  estimated_duration: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  content: string | null;
  order_index: number;
  created_at: string;
}

export interface UserModuleProgress {
  id: string;
  user_id: string;
  module_id: string;
  unlocked: boolean;
  completion_percentage: number;
  last_accessed_at: string;
  created_at: string;
}

export interface UserLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface ModuleWithProgress extends Module {
  progress?: UserModuleProgress;
}
