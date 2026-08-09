import type { Metadata } from 'next';
import ApplyForm from './ApplyForm';

export const metadata: Metadata = {
  title: '覇気を放つ | 覇気.com',
  description: '名前を入れて、あなただけの覇気全開ページを作ろう。',
};

export default function ApplyPage() {
  return <ApplyForm />;
}
