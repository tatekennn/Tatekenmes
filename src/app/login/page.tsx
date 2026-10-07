import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'ログイン・無料登録 | 覇気.com',
  description: '覇気.comの無料登録・ログイン画面です。',
};

export default function LoginPage() {
  return <LoginClient />;
}
