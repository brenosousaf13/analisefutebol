export const validateCPF = (cpf: string): boolean => {
    // Remove non-digits
    const cleanCPF = cpf.replace(/\D/g, '');

    // Check length
    if (cleanCPF.length !== 11) return false;

    // Check for all same digits (e.g., 111.111.111-11)
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

    // Validate first digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    let digit1 = (remainder === 10 || remainder === 11) ? 0 : remainder;

    if (digit1 !== parseInt(cleanCPF.charAt(9))) return false;

    // Validate second digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    let digit2 = (remainder === 10 || remainder === 11) ? 0 : remainder;

    if (digit2 !== parseInt(cleanCPF.charAt(10))) return false;

    return true;
};
