import { describe, expect, it } from 'vitest';
import {
  calculateSummary,
  computeExpenseCreditA,
  computeUserAShare,
  exportExpensesToCsv,
  filterAndSortExpenses,
  parseCsvImport
} from './finance';
import { DEFAULT_FILTERS, DEFAULT_SETTINGS } from './constants';
import { Expense } from '../types';

describe('SplitSheet Finance & Filtering Engine', () => {
  it('computes net balance accurately across 50-50, 100% owed, custom splits, and settlements', () => {
    const expenses: Expense[] = [
      // 1. User A pays €100, 50/50 -> User B owes User A €50
      {
        id: '1',
        date: '2026-10-01',
        title: 'Groceries',
        amount: 100,
        currency: 'EUR',
        exchangeRate: 1,
        baseAmount: 100,
        paidBy: 'userA',
        splitType: '50-50',
        userAShare: computeUserAShare(100, '50-50', 'userA'),
        category: 'Groceries',
        notes: '',
        isDeleted: false,
        updatedAt: 1
      },
      // 2. User A pays €40 for User B (100-B) -> User B owes User A €40
      {
        id: '2',
        date: '2026-10-02',
        title: 'Gift for B mom',
        amount: 40,
        currency: 'EUR',
        exchangeRate: 1,
        baseAmount: 40,
        paidBy: 'userA',
        splitType: '100-B',
        userAShare: computeUserAShare(40, '100-B', 'userA'),
        category: 'Shopping',
        notes: '',
        isDeleted: false,
        updatedAt: 2
      },
      // 3. User B pays €60, 50/50 -> User A owes User B €30
      {
        id: '3',
        date: '2026-10-03',
        title: 'Dinner',
        amount: 60,
        currency: 'EUR',
        exchangeRate: 1,
        baseAmount: 60,
        paidBy: 'userB',
        splitType: '50-50',
        userAShare: computeUserAShare(60, '50-50', 'userB'),
        category: 'Dining Out',
        notes: '',
        isDeleted: false,
        updatedAt: 3
      }
    ];

    expect(computeExpenseCreditA(expenses[0])).toBe(50);
    expect(computeExpenseCreditA(expenses[1])).toBe(40);
    expect(computeExpenseCreditA(expenses[2])).toBe(-30);

    const summaryBefore = calculateSummary(expenses);
    // Net balance: +50 + 40 - 30 = +60 (User B owes User A €60)
    expect(summaryBefore.netBalanceA).toBe(60);
    expect(summaryBefore.totalSpend).toBe(200);
    expect(summaryBefore.userAPaid).toBe(140);
    expect(summaryBefore.userBPaid).toBe(60);

    // 4. Now User B settles up €60 to User A
    const settlement: Expense = {
      id: '4',
      date: '2026-10-04',
      title: 'Settlement',
      amount: 60,
      currency: 'EUR',
      exchangeRate: 1,
      baseAmount: 60,
      paidBy: 'userB',
      splitType: 'settlement',
      userAShare: computeUserAShare(60, 'settlement', 'userB'),
      category: 'Settlement',
      notes: '',
      isDeleted: false,
      updatedAt: 4
    };

    const summaryAfter = calculateSummary([...expenses, settlement]);
    expect(summaryAfter.netBalanceA).toBe(0);
    // Total spend should not include settlements
    expect(summaryAfter.totalSpend).toBe(200);
    expect(summaryAfter.settlementCount).toBe(1);
  });

  it('filters expenses by search tokens, category, payer, and amount range', () => {
    const items: Expense[] = [
      {
        id: 'a',
        date: '2026-10-10',
        title: 'Carrefour Supermarket',
        amount: 85,
        currency: 'EUR',
        exchangeRate: 1,
        baseAmount: 85,
        paidBy: 'userA',
        splitType: '50-50',
        userAShare: 42.5,
        category: 'Groceries',
        notes: 'Weekly food',
        isDeleted: false,
        updatedAt: 10
      },
      {
        id: 'b',
        date: '2026-10-12',
        title: 'Uber to Airport',
        amount: 32,
        currency: 'USD',
        exchangeRate: 0.9,
        baseAmount: 28.8,
        paidBy: 'userB',
        splitType: '50-50',
        userAShare: 14.4,
        category: 'Transport',
        notes: 'Lisbon trip',
        isDeleted: false,
        updatedAt: 11
      }
    ];

    const bySearch = filterAndSortExpenses(
      items,
      { ...DEFAULT_FILTERS, search: 'airport lisbon' },
      DEFAULT_SETTINGS
    );
    expect(bySearch).toHaveLength(1);
    expect(bySearch[0].id).toBe('b');

    const byMinAmount = filterAndSortExpenses(
      items,
      { ...DEFAULT_FILTERS, minAmount: '50' },
      DEFAULT_SETTINGS
    );
    expect(byMinAmount).toHaveLength(1);
    expect(byMinAmount[0].id).toBe('a');
  });

  it('parses Tricount/CSV imports and exports CSV cleanly', () => {
    const csv = [
      'Title,Amount,Currency,Paid By,Date,Category',
      'Supermarket,64.80,EUR,Renato,2026-10-15,Groceries',
      'Sushi Night,42.00,EUR,Partner,2026-10-16,Dining Out'
    ].join('\n');

    const parsed = parseCsvImport(csv, DEFAULT_SETTINGS);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].title).toBe('Supermarket');
    expect(parsed[0].paidBy).toBe('userA');
    expect(parsed[0].userAShare).toBe(32.4);
    expect(parsed[1].paidBy).toBe('userB');
    expect(parsed[1].category).toBe('Dining Out');

    const exported = exportExpensesToCsv(parsed, DEFAULT_SETTINGS);
    expect(exported).toContain('Supermarket');
    expect(exported).toContain('Sushi Night');
  });
});
