// Local development access only; this does not grant server or data privileges.
export const isRootAccount = account => account?.name?.trim() === '공수교대' && account?.studentId === '099746';
export const validStudentId = (name, studentId) => typeof studentId === 'string' && (studentId === '099746' ? isRootAccount({name, studentId}) : /^[A-Za-z0-9_-]{1,20}$/.test(studentId));
