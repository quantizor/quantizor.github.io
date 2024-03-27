import { Title } from '@solidjs/meta';
import { ParentProps } from 'solid-js';

export default function SiteTitle(props: ParentProps) {
  return <Title>{props.children}</Title>;
}
