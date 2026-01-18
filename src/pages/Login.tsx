import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check, Shield, User, Calendar, FileText, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // Step state for registration wizard
    const [step, setStep] = useState(1);

    // Password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        email: '',
        confirmEmail: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        birthDate: '',
        cpf: '',
        phone: ''
    });

    // Validation Errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Mask functions
    const maskDate = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '$1/$2')
            .replace(/(\d{2})(\d)/, '$1/$2')
            .replace(/(\d{4})\d+?$/, '$1');
    };

    const maskCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const maskPhone = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // Immediate validation for mismatch
        if (name === 'confirmEmail' && value) {
            if (value !== formData.email) {
                setErrors(prev => ({ ...prev, confirmEmail: 'Os e-mails não coincidem' }));
            } else {
                setErrors(prev => {
                    const newErr = { ...prev };
                    delete newErr.confirmEmail;
                    return newErr;
                });
            }
        }

        if (name === 'confirmPassword' && value) {
            if (value !== formData.password) {
                setErrors(prev => ({ ...prev, confirmPassword: 'As senhas não coincidem' }));
            } else {
                setErrors(prev => {
                    const newErr = { ...prev };
                    delete newErr.confirmPassword;
                    return newErr;
                });
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (name === 'birthDate') finalValue = maskDate(value);
        if (name === 'cpf') finalValue = maskCPF(value);
        if (name === 'phone') finalValue = maskPhone(value);

        setFormData(prev => ({ ...prev, [name]: finalValue }));

        // Clear errors on change
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
        setAuthError(null);
    };

    const validateStep1 = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.firstName) newErrors.firstName = 'Nome é obrigatório';
        if (!formData.lastName) newErrors.lastName = 'Sobrenome é obrigatório';
        if (!formData.birthDate || formData.birthDate.length < 10) newErrors.birthDate = 'Data inválida';
        if (!formData.cpf || formData.cpf.length < 14) newErrors.cpf = 'CPF inválido';
        if (!formData.phone || formData.phone.length < 15) newErrors.phone = 'Celular inválido';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateFinal = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.email) newErrors.email = 'E-mail é obrigatório';
        if (formData.email !== formData.confirmEmail) newErrors.confirmEmail = 'Os e-mails não coincidem';

        if (!formData.password) newErrors.password = 'Senha é obrigatória';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep = (e: React.MouseEvent) => {
        e.preventDefault();
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handlePrevStep = (e: React.MouseEvent) => {
        e.preventDefault();
        setStep(1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);

        if (isRegistering) {
            if (validateFinal()) {
                setIsLoading(true);
                try {
                    const { error } = await supabase.auth.signUp({
                        email: formData.email,
                        password: formData.password,
                        options: {
                            emailRedirectTo: window.location.origin,
                            data: {
                                full_name: `${formData.firstName} ${formData.lastName}`,
                                birth_date: formData.birthDate,
                                cpf: formData.cpf,
                                phone: formData.phone,
                            }
                        }
                    });

                    if (error) throw error;

                    navigate('/');
                } catch (error: any) {
                    console.error("Registration error:", error);
                    setAuthError(error.message || "Erro ao criar conta. Tente novamente.");
                } finally {
                    setIsLoading(false);
                }
            }
        } else {
            setIsLoading(true);
            try {
                const { error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                });

                if (error) throw error;

                navigate('/');
            } catch (error: any) {
                console.error("Login error:", error);

                if (error.message.includes('Invalid login credentials')) {
                    setAuthError('E-mail ou senha incorretos.');
                } else {
                    setAuthError(error.message || "Erro ao entrar. Tente novamente.");
                }
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Toggle mode
    const toggleMode = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsRegistering(!isRegistering);
        setStep(1);
        setErrors({});
        setAuthError(null);
    };

    return (
        <div className="flex flex-col lg:flex-row h-screen w-full bg-[#fafafa] dark:bg-[#1a1a1a] font-sans selection:bg-[#00e1ff] selection:text-black overflow-hidden">
            {/* Left Panel: Immersive Visual */}
            <div className="relative hidden lg:flex w-5/12 flex-col justify-end overflow-hidden bg-[#1a1a1a] group">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1577223625816-7546f13df25d?q=80&w=3540&auto=format&fit=crop')" }}
                ></div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f2124] via-[#0f2124]/60 to-transparent opacity-90"></div>

                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,225,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,225,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>

                {/* Content */}
                <div className="relative z-10 p-12 flex flex-col gap-6 text-left">
                    <div className="w-12 h-1 bg-[#00e1ff] mb-2"></div>
                    <h1 className="text-white text-5xl xl:text-6xl font-black leading-tight tracking-tight drop-shadow-lg">
                        VITÓRIA<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e1ff] to-white">
                            GUIADA POR DADOS.
                        </span>
                    </h1>
                    <p className="text-gray-300 text-lg max-w-md font-light leading-relaxed border-l-2 border-white/20 pl-4">
                        Análises de precisão para o jogo moderno. Acesse a plataforma de dados de futebol mais abrangente do mundo.
                    </p>

                    {/* Stat decoration */}
                    <div className="flex gap-8 pt-4 mt-4 border-t border-white/10">
                        <div>
                            <div className="text-[#00e1ff] font-bold text-2xl font-mono">98.4%</div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Precisão de Passe</div>
                        </div>
                        <div>

                            <div className="text-white font-bold text-2xl font-mono">14.2<span className="text-sm align-top">km</span></div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">Distância Percorrida</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Login Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 bg-[#fafafa] relative overflow-y-auto">
                {/* Mobile decorative background logic */}
                <div className="absolute inset-0 bg-white lg:bg-[#f4f7f7] -z-10"></div>

                {/* Abstract decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#00e1ff]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="w-full max-w-[440px] flex flex-col gap-8 bg-white lg:p-10 lg:rounded-2xl lg:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-transparent lg:border-slate-100 my-auto">
                    {/* Header */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-center mb-6">
                            <img src="/ZonaLogoOficial.png" alt="Zona 14" className="h-24 w-auto object-contain" />
                        </div>
                        <p className="text-slate-500 text-sm">
                            {isRegistering
                                ? (step === 1 ? "Etapa 1: Dados Pessoais" : "Etapa 2: Credenciais de Acesso")
                                : "Entre com suas credenciais para acessar o painel."}
                        </p>
                    </div>

                    {/* Auth Error Alert */}
                    {authError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={16} />
                            <span>{authError}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>

                        {/* REGISTER STEP 1: PERSONAL DATA */}
                        {isRegistering && step === 1 && (
                            <>
                                {/* Name */}
                                <label className="flex flex-col gap-1.5 group">
                                    <div className="flex justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-[#00e1ff] transition-colors">Nome</span>
                                    </div>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3.5 text-slate-400 flex items-center pointer-events-none group-focus-within:text-[#0f2124] transition-colors">
                                            <User size={20} />
                                        </div>
                                        <input
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            className={`w-full bg-slate-50 border rounded-lg py-3.5 pl-11 pr-4 text-[#0f2124] placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#00e1ff]/20 focus:border-[#00e1ff] transition-all shadow-sm ${errors.firstName ? 'border-red-500' : 'border-slate-200'}`}
                                            placeholder="João"
                                            type="text"
                                        />
                                    </div>
                                    {errors.firstName && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.firstName}</span>}
                                </label>

                                {/* Surname */}
                                <label className="flex flex-col gap-1.5 group">
                                    <div className="flex justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-[#00e1ff] transition-colors">Sobrenome</span>
                                    </div>
                                    <input
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className={`w-full bg-slate-50 border rounded-lg py-3.5 px-4 text-[#0f2124] placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#00e1ff]/20 focus:border-[#00e1ff] transition-all shadow-sm ${errors.lastName ? 'border-red-500' : 'border-slate-200'}`}
                                        placeholder="Silva"
                                        type="text"
                                    />
                                    {errors.lastName && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.lastName}</span>}
                                </label>

                                {/* Birth Date */}
                                <label className="flex flex-col gap-1.5 group">
                                    <div className="flex justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-[#00e1ff] transition-colors">Nascimento</span>
                                    </div>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3.5 text-slate-400 flex items-center pointer-events-none group-focus-within:text-[#0f2124] transition-colors">
                                            <Calendar size={20} />
                                        </div>
                                        <input
                                            name="birthDate"
                                            value={formData.birthDate}
                                            onChange={handleChange}
                                            maxLength={10}
                                            className={`w-full bg-slate-50 border rounded-lg py-3.5 pl-11 pr-4 text-[#0f2124] placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#00e1ff]/20 focus:border-[#00e1ff] transition-all shadow-sm ${errors.birthDate ? 'border-red-500' : 'border-slate-200'}`}
                                            placeholder="DD/MM/AAAA"
                                            type="text"
                                        />
                                    </div>
                                    {errors.birthDate && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.birthDate}</span>}
                                </label>

                                {/* CPF */}
                                <label className="flex flex-col gap-1.5 group">
                                    <div className="flex justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-[#00e1ff] transition-colors">CPF</span>
                                    </div>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3.5 text-slate-400 flex items-center pointer-events-none group-focus-within:text-[#0f2124] transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <input
                                            name="cpf"
                                            value={formData.cpf}
                                            onChange={handleChange}
                                            maxLength={14}
                                            className={`w-full bg-slate-50 border rounded-lg py-3.5 pl-11 pr-4 text-[#0f2124] placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#00e1ff]/20 focus:border-[#00e1ff] transition-all shadow-sm ${errors.cpf ? 'border-red-500' : 'border-slate-200'}`}
                                            placeholder="000.000.000-00"
                                            type="text"
                                        />
                                    </div>
                                    {errors.cpf && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.cpf}</span>}
                                </label>

                                {/* Phone */}
                                <label className="flex flex-col gap-1.5 group">
                                    <div className="flex justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-[#00e1ff] transition-colors">Celular</span>
                                    </div>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3.5 text-slate-400 flex items-center pointer-events-none group-focus-within:text-[#0f2124] transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        </div>
                                        <input
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            maxLength={15}
                                            className={`w-full bg-slate-50 border rounded-lg py-3.5 pl-11 pr-4 text-[#0f2124] placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#00e1ff]/20 focus:border-[#00e1ff] transition-all shadow-sm ${errors.phone ? 'border-red-500' : 'border-slate-200'}`}
                                            placeholder="(11) 99999-9999"
                                            type="text"
                                        />
                                    </div>
                                    {errors.phone && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.phone}</span>}
                                </label>
                            </>
                        )}

                        {/* REGISTER STEP 2 or LOGIN */}
                        {(!isRegistering || step === 2) && (
                            <>
                                {/* Credential ID / Email */}
                                <label className="flex flex-col gap-1.5 group">
                                    <div className="flex justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-[#00e1ff] transition-colors">E-mail</span>
                                    </div>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3.5 text-slate-400 flex items-center pointer-events-none group-focus-within:text-[#0f2124] transition-colors">
                                            <Mail size={20} />
                                        </div>
                                        <input
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className={`w-full bg-slate-50 border rounded-lg py-3.5 pl-11 pr-4 text-[#0f2124] placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#00e1ff]/20 focus:border-[#00e1ff] transition-all shadow-sm ${errors.email ? 'border-red-500' : 'border-slate-200'}`}
                                            placeholder="analista@clube.com"
                                            type="email"
                                        />
                                    </div>
                                    {errors.email && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.email}</span>}
                                </label>

                                {/* Confirm Email (Register Step 2 only) */}
                                {isRegistering && step === 2 && (
                                    <label className="flex flex-col gap-1.5 group">
                                        <div className="flex justify-between">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-[#00e1ff] transition-colors">Confirmar E-mail</span>
                                        </div>
                                        <div className="relative flex items-center">
                                            <div className="absolute left-3.5 text-slate-400 flex items-center pointer-events-none group-focus-within:text-[#0f2124] transition-colors">
                                                <Check size={20} />
                                            </div>
                                            <input
                                                name="confirmEmail"
                                                value={formData.confirmEmail}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                className={`w-full bg-slate-50 border rounded-lg py-3.5 pl-11 pr-4 text-[#0f2124] placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#00e1ff]/20 focus:border-[#00e1ff] transition-all shadow-sm ${errors.confirmEmail ? 'border-red-500' : 'border-slate-200'}`}
                                                placeholder="Confirme seu e-mail"
                                                type="email"
                                            />
                                        </div>
                                        {errors.confirmEmail && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.confirmEmail}</span>}
                                    </label>
                                )}

                                {/* Secure Key / Password */}
                                <label className="flex flex-col gap-1.5 group">
                                    <div className="flex justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-[#00e1ff] transition-colors">Senha</span>
                                        {!isRegistering && (
                                            <a href="#" className="text-[11px] font-bold text-slate-400 hover:text-[#0f2124] transition-colors">ESQUECEU A SENHA?</a>
                                        )}
                                    </div>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3.5 text-slate-400 flex items-center pointer-events-none group-focus-within:text-[#0f2124] transition-colors">
                                            <Lock size={20} />
                                        </div>
                                        <input
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className={`w-full bg-slate-50 border rounded-lg py-3.5 pl-11 pr-4 text-[#0f2124] placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#00e1ff]/20 focus:border-[#00e1ff] transition-all shadow-sm tracking-widest ${errors.password ? 'border-red-500' : 'border-slate-200'}`}
                                            placeholder="••••••••"
                                            type={showPassword ? "text" : "password"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 text-slate-400 hover:text-[#00e1ff] transition-colors flex items-center cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {errors.password && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.password}</span>}
                                </label>

                                {/* Confirm Password (Register Step 2 only) */}
                                {isRegistering && step === 2 && (
                                    <label className="flex flex-col gap-1.5 group">
                                        <div className="flex justify-between">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-[#00e1ff] transition-colors">Confirmar Senha</span>
                                        </div>
                                        <div className="relative flex items-center">
                                            <div className="absolute left-3.5 text-slate-400 flex items-center pointer-events-none group-focus-within:text-[#0f2124] transition-colors">
                                                <Check size={20} />
                                            </div>
                                            <input
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                className={`w-full bg-slate-50 border rounded-lg py-3.5 pl-11 pr-4 text-[#0f2124] placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#00e1ff]/20 focus:border-[#00e1ff] transition-all shadow-sm tracking-widest ${errors.confirmPassword ? 'border-red-500' : 'border-slate-200'}`}
                                                placeholder="••••••••"
                                                type={showConfirmPassword ? "text" : "password"}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3.5 text-slate-400 hover:text-[#00e1ff] transition-colors flex items-center cursor-pointer"
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                        {errors.confirmPassword && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.confirmPassword}</span>}
                                    </label>
                                )}
                            </>
                        )}

                        {/* Navigation Buttons for Register Flow */}
                        {isRegistering && step === 1 && (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="relative group overflow-hidden w-full h-12 rounded-lg bg-[#0f2124] hover:bg-[#152e32] transition-all duration-300 flex items-center justify-center shadow-lg shadow-[#00e1ff]/10"
                            >
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-[#00e1ff] via-[#4ff] to-[#00e1ff] transition-opacity duration-300"></div>
                                <div className="relative flex items-center gap-2 z-10">
                                    <span className="text-white group-hover:text-[#0f2124] font-bold tracking-wide text-sm uppercase transition-colors">Próximo</span>
                                    <ArrowRight className="text-[#00e1ff] group-hover:text-[#0f2124] transition-colors" size={20} />
                                </div>
                            </button>
                        )}

                        {/* Navigation Buttons for Step 2 */}
                        {isRegistering && step === 2 && (
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handlePrevStep}
                                    className="h-12 w-12 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                >
                                    <ArrowLeft size={20} className="text-slate-600" />
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="relative flex-1 group overflow-hidden h-12 rounded-lg bg-[#0f2124] hover:bg-[#152e32] transition-all duration-300 flex items-center justify-center shadow-lg shadow-[#00e1ff]/10 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-[#00e1ff] via-[#4ff] to-[#00e1ff] transition-opacity duration-300"></div>
                                    <div className="relative flex items-center gap-2 z-10">
                                        {isLoading ? (
                                            <Loader2 className="animate-spin text-[#00e1ff]" size={20} />
                                        ) : (
                                            <>
                                                <span className="text-white group-hover:text-[#0f2124] font-bold tracking-wide text-sm uppercase transition-colors">Efetuar Cadastro</span>
                                                <ArrowRight className="text-[#00e1ff] group-hover:text-[#0f2124] transition-colors" size={20} />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Login Button (Only when NOT registering) */}
                        {!isRegistering && (
                            <>
                                <div className="flex items-center gap-3 py-1">
                                    <div className="relative flex items-center">
                                        <input
                                            id="remember"
                                            type="checkbox"
                                            className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 bg-white checked:border-[#00e1ff] checked:bg-[#00e1ff] transition-all hover:border-[#00e1ff]/50 focus:ring-2 focus:ring-[#00e1ff]/20 focus:ring-offset-1"
                                        />
                                        <Check className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" size={14} strokeWidth={4} />
                                    </div>
                                    <label htmlFor="remember" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                                        Mantenha-me conectado
                                    </label>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="relative group overflow-hidden w-full h-12 rounded-lg bg-[#0f2124] hover:bg-[#152e32] transition-all duration-300 flex items-center justify-center shadow-lg shadow-[#00e1ff]/10 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-[#00e1ff] via-[#4ff] to-[#00e1ff] transition-opacity duration-300"></div>
                                    <div className="relative flex items-center gap-2 z-10">
                                        {isLoading ? (
                                            <Loader2 className="animate-spin text-[#00e1ff]" size={20} />
                                        ) : (
                                            <>
                                                <span className="text-white group-hover:text-[#0f2124] font-bold tracking-wide text-sm uppercase transition-colors">Iniciar Sessão</span>
                                                <ArrowRight className="text-[#00e1ff] group-hover:text-[#0f2124] transition-colors" size={20} />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </>
                        )}
                    </form>

                    {/* Footer Request */}
                    <div className="text-center mt-2">
                        <p className="text-sm text-slate-500">
                            {isRegistering ? "Já tem uma conta de analista? " : "Não tem uma conta de analista? "}
                            <button
                                onClick={toggleMode}
                                className="text-[#0f2124] font-bold hover:text-[#00e1ff] transition-colors underline decoration-2 decoration-transparent hover:decoration-[#00e1ff] underline-offset-4"
                            >
                                {isRegistering ? "Iniciar Sessão" : "Criar Conta"}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Bottom decorative */}
                <div className="relative mt-8 text-center hidden lg:block">
                    <p className="text-[10px] text-slate-400 font-mono flex items-center justify-center gap-2">
                        <Shield size={10} />
                        PROTEGIDO POR CRIPTOGRAFIA DE PONTA A PONTA
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
