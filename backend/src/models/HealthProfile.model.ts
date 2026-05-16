export interface HealthProfile {
  ageRange: string;
  sex?: string;
  conditions: string[];
  allergies: string[];
  medications: string;
  pregnant?: boolean;
}
