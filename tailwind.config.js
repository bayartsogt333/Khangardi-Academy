/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        colors: {
            // Surface Layers
            surface: '#121414',
            'surface-dim': '#121414',
            'surface-bright': '#38393a',
            'surface-container-lowest': '#0d0e0f',
            'surface-container-low': '#1a1c1c',
            'surface-container': '#1e2020',
            'surface-container-high': '#292a2a',
            'surface-container-highest': '#343535',
            'on-surface': '#e3e2e2',
            'on-surface-variant': '#d1c6ab',
            'inverse-surface': '#e3e2e2',
            'inverse-on-surface': '#2f3131',

            // Primary Accent (Gold)
            primary: '#ffecb9',
            'on-primary': '#3c2f00',
            'primary-container': '#facc15',
            'on-primary-container': '#6c5700',
            'inverse-primary': '#735c00',
            'primary-fixed': '#ffe083',
            'primary-fixed-dim': '#eec200',
            'on-primary-fixed': '#231b00',
            'on-primary-fixed-variant': '#574500',

            // Secondary
            secondary: '#c8c6c5',
            'on-secondary': '#313030',
            'secondary-container': '#474746',
            'on-secondary-container': '#b7b5b4',
            'secondary-fixed': '#e5e2e1',
            'secondary-fixed-dim': '#c8c6c5',
            'on-secondary-fixed': '#1c1b1b',
            'on-secondary-fixed-variant': '#474746',

            // Tertiary
            tertiary: '#f0ecec',
            'on-tertiary': '#313030',
            'tertiary-container': '#d3d0d0',
            'on-tertiary-container': '#5a5959',
            'tertiary-fixed': '#e5e2e1',
            'tertiary-fixed-dim': '#c8c6c5',
            'on-tertiary-fixed': '#1c1b1b',
            'on-tertiary-fixed-variant': '#474646',

            // Error
            error: '#ffb4ab',
            'on-error': '#690005',
            'error-container': '#93000a',
            'on-error-container': '#ffdad6',

            // Outline & Background
            outline: '#9a9078',
            'outline-variant': '#4d4632',
            'surface-tint': '#eec200',
            background: '#121414',
            'on-background': '#e3e2e2',
            'surface-variant': '#343535',

            // Common colors
            transparent: 'transparent',
            current: 'currentColor',
            white: '#ffffff',
            black: '#000000',
            success: '#4ade80',
            warning: '#facc15',
        },
        fontFamily: {
            inter: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        },
        fontSize: {
            'display-lg': [
                '48px',
                {
                    lineHeight: '1.1',
                    fontWeight: '700',
                    letterSpacing: '-0.02em',
                },
            ],
            'headline-lg': [
                '32px',
                {
                    lineHeight: '1.2',
                    fontWeight: '600',
                    letterSpacing: '-0.01em',
                },
            ],
            'headline-md': [
                '24px',
                {
                    lineHeight: '1.3',
                    fontWeight: '600',
                },
            ],
            'body-lg': [
                '18px',
                {
                    lineHeight: '1.6',
                    fontWeight: '400',
                },
            ],
            'body-md': [
                '16px',
                {
                    lineHeight: '1.6',
                    fontWeight: '400',
                },
            ],
            'body-sm': [
                '14px',
                {
                    lineHeight: '1.5',
                    fontWeight: '400',
                },
            ],
            'label-md': [
                '14px',
                {
                    lineHeight: '1',
                    fontWeight: '600',
                    letterSpacing: '0.05em',
                },
            ],
            'label-sm': [
                '12px',
                {
                    lineHeight: '1',
                    fontWeight: '500',
                },
            ],
            xs: '12px',
            sm: '14px',
            base: '16px',
            lg: '18px',
            xl: '20px',
        },
        borderRadius: {
            none: '0px',
            xs: '4px',
            sm: '6px',
            DEFAULT: '8px',
            md: '12px',
            lg: '16px',
            xl: '24px',
            full: '9999px',
        },
        spacing: {
            0: '0px',
            1: '4px',
            2: '8px',
            3: '12px',
            4: '16px',
            5: '20px',
            6: '24px',
            7: '28px',
            8: '32px',
            9: '36px',
            10: '40px',
            12: '48px',
            14: '56px',
            16: '64px',
            20: '80px',
            24: '96px',
            28: '112px',
            32: '128px',
        },
        maxWidth: {
            none: 'none',
            full: '100%',
            screen: '100vw',
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
            'container-max': '1200px',
        },
        extend: {
            boxShadow: {
                'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
                'gold-glow': '0 0 24px rgba(250, 204, 21, 0.3)',
            },
            borderColor: {
                DEFAULT: 'rgba(255, 255, 255, 0.08)',
            },
        },
    },
    plugins: [],
}
