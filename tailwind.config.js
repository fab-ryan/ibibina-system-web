/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                "ib-primary": "#0b3978",
                "ib-secondary": "#375176",
                "ib-accent": "#0b3978",
                "ib-background": "#f9f9f9",
                "ib-line": "#d9e2f1",
                "ib-link": "#081936",

            },
        },
    },
    plugins: [],
};