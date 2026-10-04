export interface Task {
  readonly id: number;
  readonly title: string;
  readonly completed: boolean;
}

export interface TaskCompletionRequest {
  readonly completed: boolean;
}
