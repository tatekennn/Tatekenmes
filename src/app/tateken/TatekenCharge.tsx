'use client';

import HakiCharge from '../../components/HakiCharge';

// たてけん専用ページ。演出ロジックは汎用の HakiCharge を流用し、
// MAX 文言だけ従来どおり「覇 気 全 開」を維持する。
export default function TatekenCharge() {
  return <HakiCharge name="たてけん" finaleText="覇 気 全 開" />;
}
