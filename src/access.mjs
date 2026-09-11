// Local development access only; this does not grant server or data privileges.
export const isRootAccount = account => account?.name?.trim() === '공수교대' && account?.studentId === '099746';
export const validStudentId = (name, studentId) => typeof studentId === 'string' && (/^[0-9]{8}$/.test(studentId) || isRootAccount({name, studentId}));
