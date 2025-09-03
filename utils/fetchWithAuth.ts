// Global fetch wrapper to handle 401 errors and redirect to login

export const fetchWithAuth = async (url: string, tokenOrOptions?: string | RequestInit) => {
  let options: RequestInit = {};
  if (typeof tokenOrOptions === 'string' && tokenOrOptions) {
    options.headers = {
      'Authorization': `Bearer ${tokenOrOptions}`,
    };
  } else if (typeof tokenOrOptions === 'object' && tokenOrOptions !== null) {
    options = tokenOrOptions;
  }
  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  return res;
};
