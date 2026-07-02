import type { Component } from 'vue';

// 定义了 About 组件接受的 Props
interface AboutProps {
  description?: string;
  name?: string;
  title?: string;
}

// 描述项接口
interface DescriptionItem {
  content: Component | string;
  title: string;
}

export type { AboutProps, DescriptionItem };
