export type ProjectIntake = {
  project: {
    projectName: string;
    city: string;
    locationDescription: string;
    structureType: string;
    elementType: string;
    clientName: string;
    contractorName: string;
    consultantName: string;
  };
  laboratory: {
    labName: string;
    licenseNumber: string;
    address: string;
    phone: string;
    logoPath?: string;
  };
  designer: {
    fullName: string;
    role: string;
    licenseOrMembershipNumber: string;
    phone: string;
    email: string;
  };
  mixDesign: {
    concreteType: string;
    targetStrengthMpa: number;
    requiredSlumpMm: number;
    maxAggregateSizeMm: number;
    exposureSummary: string;
  };
};

export type SaveProjectResponse = {
  status: 'pass' | 'fail';
  projectId?: string;
  mixDesignId?: string;
  databasePath?: string;
  error?: string;
};
