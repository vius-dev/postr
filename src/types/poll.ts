
export type PollChoice = {
  text: string;
  color: string;
  vote_count: number;
};

export type Poll = {
  question: string;
  choices: PollChoice[];
};
