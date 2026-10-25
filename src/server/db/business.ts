import 'server-only';
import { getServiceClient } from './client';
import { createBusinessDb, type BusinessDb } from './business-core';

export * from './business-core';

let db: BusinessDb | null = null;
const get = (): BusinessDb => (db ??= createBusinessDb(getServiceClient()));

export const createBudgetPlan: BusinessDb['createBudgetPlan'] = (...a) => get().createBudgetPlan(...a);
export const createPlanVersion: BusinessDb['createPlanVersion'] = (...a) => get().createPlanVersion(...a);
export const decideBudgetPlan: BusinessDb['decideBudgetPlan'] = (...a) => get().decideBudgetPlan(...a);
export const recordOrgDocument: BusinessDb['recordOrgDocument'] = (...a) => get().recordOrgDocument(...a);
