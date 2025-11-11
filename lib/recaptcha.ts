interface RecaptchaV2Response {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

interface RecaptchaV3Response {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function verifyRecaptchaV2(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_V2_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error("RECAPTCHA_V2_SECRET_KEY is not configured");
  }

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `secret=${secretKey}&response=${token}`,
  });

  const data: RecaptchaV2Response = await response.json();
  return data.success;
}

export async function verifyRecaptchaV3(token: string, minScore: number = 0.5): Promise<{
  success: boolean;
  score: number;
}> {
  const secretKey = process.env.RECAPTCHA_V3_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error("RECAPTCHA_V3_SECRET_KEY is not configured");
  }

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `secret=${secretKey}&response=${token}`,
  });

  const data: RecaptchaV3Response = await response.json();
  const score = data.score || 0;
  
  return {
    success: data.success && score >= minScore,
    score,
  };
}
