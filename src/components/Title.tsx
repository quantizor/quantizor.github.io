import { Title, Meta } from '@solidjs/meta';
import { ParentProps } from 'solid-js';

export default function SiteTitle(props: ParentProps) {
  return [<Title>{[props.children, "quantizor's lab"].filter(Boolean).join(' ← ')}</Title>, <Meta name="og:title" content={props.children as string} />];
}
