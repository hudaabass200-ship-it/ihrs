export type JobProfile = {
  id: string;
  title: string;
  field: string;
  experience: string;
  skills: string;
  professionalBackground: string;
  otherRequirements: string;
};

export type CVResult = {
  id: string;
  jobProfileId: string;
  candidateName: string;
  score: number;
  strengths: string[];
  summary: string;
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
};
