import {redirect} from 'react-router';
import type {Route} from './+types/account_.logout';
import {clearAccountCache} from '~/lib/accountCache';

// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
export async function loader() {
  return redirect('/');
}

export async function action({context}: Route.ActionArgs) {
  return context.customerAccount.logout();
}

// Wipe the in-memory orders cache on the client before the server logs out, so a
// different customer on a shared device can never see the previous one's orders.
export async function clientAction({serverAction}: Route.ClientActionArgs) {
  clearAccountCache();
  return serverAction();
}
