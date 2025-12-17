# Miyabi Agent実行 - Issue自動処理

## 概要
指定されたIssueを分析し、自動的にコード生成・修正を行います。

## 実行手順

1. `gh issue list` で未処理のIssueを確認
2. `agent:auto` ラベルが付いたIssueを優先処理
3. Issue内容を分析して実装計画を作成
4. コードを生成・修正
5. テストを実行して品質確認
6. PRを作成してレビュー依頼

## 使用例

```
/miyabi-agent 1
```

Issue #1を自動処理します。
