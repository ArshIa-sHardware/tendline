import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { Workspace } from './components/Workspace';
export function App() {
  const auth = useAuth(),
    [demo, setDemo] = useState(false);
  if (auth.loading)
    return (
      <div className="loading" role="status">
        Opening tendline…
      </div>
    );
  if (demo) return <Workspace key="example" owner={null} exitDemo={() => setDemo(false)} />;
  if (!auth.session || auth.recovery)
    return (
      <AuthScreen
        onDemo={() => setDemo(true)}
        recovery={auth.recovery}
        hasSession={Boolean(auth.session)}
        finishRecovery={auth.finishRecovery}
        authError={auth.error}
      />
    );
  return (
    <Workspace
      key={auth.session.user.id}
      owner={auth.session.user.id}
      email={auth.session.user.email}
      exitDemo={() => setDemo(false)}
    />
  );
}
