/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { Input } from "@/components/ui";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";
import { images } from "@/constants";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import Button from "@/components/ui/button";
import { useLoginMutation } from "@/api/auth";
import { useAuth } from "@/contexts";
const AuthSchema = yup.object()
    .shape({
        identifier: yup
            .string()
            .test("email-or-phone", function (value) {
                if (!value) return this.createError({ message: "Please enter your email or phone number." });

                const isNumber = /^[0-9+]+$/.test(value);

                // 👉 If input looks like a phone number
                if (isNumber) {
                    const phoneRegex = /^(?:\+250|0)?7[2389]\d{7}$/;

                    if (!phoneRegex.test(formatForPhone(value))) {
                        return this.createError({ message: "Please enter a valid phone number." });
                    }

                    return true;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                // 👉 Otherwise treat it as email
                const isValidEmail = emailRegex.test(value);

                if (!isValidEmail) {
                    return this.createError({ message: "Please enter a valid email address." });
                }

                return true;
            }),
        password: yup.string().required("Please enter your password."),
    });

type AuthFormData = yup.InferType<typeof AuthSchema>;

const formatForPhone = (value: string) => {
    if (!value) return value;

    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, "");
    // Format as +2507XXXXXXXX
    if (digitsOnly.startsWith("2507")) {
        return `+${digitsOnly}`;
    } else if (digitsOnly.startsWith("07")) {
        return `+250${digitsOnly.slice(1)}`;
    } else if (digitsOnly.startsWith("7")) {
        return `+250${digitsOnly}`;
    }
    return value; // Return as is if it doesn't match expected patterns
};


export default function AuthPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [login, { isLoading }] = useLoginMutation();

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(AuthSchema),
    });
    const { isAuthenticated, setTokens, setUser, user } = useAuth(); // Just to trigger auth state initialization on page load
    useLayoutEffect(() => {
        if (isAuthenticated) {
            if (user && user.role === "admin") {
                router.push("/dashboard/admin");
            } else if (user && user.role === "chairperson") {
                router.push("/dashboard/chairperson");
            }
            else if (user && user.role === "finance") {
                router.push("/dashboard/finance");
            }
        }
    }, [isAuthenticated, router]);

    async function handleLogin(data: AuthFormData) {
        try {
            if (isLoading) return;
            setError("");
            const result = await login({
                email: data.identifier as string,
                password: data.password,
            }).unwrap()
            if (result.success && result.data) {
                if (!result.data.tokens?.accessToken || !result.data.user) {
                    setError("Login failed. Please try again.");
                    return;
                }
                if (!setTokens || !setUser) {
                    setError("Login failed. Please try again.");
                    return;
                }
                setTokens(result.data.tokens.accessToken as string, result.data.tokens.refreshToken as string);
                setUser(result.data.user);
                if (result?.data?.user?.role === "admin") {

                    router.push("/dashboard/admin");
                } else router.push("/dashboard/chairperson");
            } else {
                setError(result.message || "Login failed. Please try again.");
            }
        } catch (error) {
            if (error instanceof Object && "data" in error && typeof error.data === "object" && error.data !== null) {
                const errData = error.data as any;
                setError(errData.message || "Login failed. Please try again.");
            } else {
                setError("An unexpected error occurred. Please try again.");
            }
        }
    }

    return (
        <main className="auth-wrap relative overflow-hidden">
            <div className="hero-grid" />
            <div className="hero-orb hero-orb-a" />
            <div className="hero-orb hero-orb-b" />

            <section className="relative z-10 w-full max-w-md px-4 py-8 sm:px-0">
                <div className="flex flex-col items-center text-center mb-8 fade-up">
                    <div className="logo-shell mb-6 w-20 h-20 rounded-2xl flex items-center justify-center text-(--ib-accent)">
                        <Image src={images.logo} alt="IBIBINA Logo" objectFit="contain" fill />
                    </div>
                    <p className="panel-tag">Secure Access</p>
                    <h1 className="headline mt-2 text-3xl sm:text-4xl">IBIBINA Portal</h1>
                    <p className="mt-3 text-sm leading-6 text-(--ib-muted)">
                        Sign in to access your administrative workspace.
                    </p>
                </div>

                <article className="auth-panel fade-up" style={{ animationDelay: "100ms" }}>
                    <form onSubmit={handleSubmit(handleLogin)} className="grid gap-5">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                                {error}
                            </div>
                        )}

                        <Input
                            id="identifier"
                            label="Username or Email"
                            type="text"
                            {...register("identifier")}
                            placeholder="E.g. admin@ibibina.rw"
                            required
                            leftIcon={Mail}
                            error={errors.identifier?.message}
                        />
                        <Input
                            id="password"
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            {...register("password")}
                            placeholder="Your secure password"
                            required
                            leftIcon={Lock}
                            rightIcon={showPassword ? EyeOff : Eye}
                            error={errors.password?.message}
                            onRightIconClick={() => setShowPassword((prev) => !prev)}

                        />


                        <Link href="#" className="text-xs font-semibold text-(--ib-accent) hover:underline">
                            Forgot password?
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="checkbox"
                                id="remember"
                                className="w-4 h-4 rounded border-(--ib-line) text-(--ib-accent) focus:ring-(--ib-accent)"
                            />
                            <label htmlFor="remember" className="text-sm text-(--ib-muted) cursor-pointer select-none">
                                Remember me for 30 days
                            </label>
                        </div>

                        <Button type="submit" loadingText="Sign In" loading={isLoading} disabled={isLoading} >
                            Sign In
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-(--ib-line) text-center text-sm text-(--ib-muted)">
                        <Link href="/" className="hover:text-(--ib-accent) transition-colors">
                            &larr; Back to home
                        </Link>
                    </div>
                </article>
            </section>
        </main>
    );
}
