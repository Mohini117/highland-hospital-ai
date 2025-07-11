export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME || "Highland Medical Center";

export const PAGE_SIZE = Number(process.env.NEXT_PUBLIC_PAGE_SIZE) || 10;

export const signInDefaultValues = {
  email: "",
  password: "",
};

export const signUpDefaultValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};
