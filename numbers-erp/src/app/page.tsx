import { supabase } from '@/lib/supabase';

interface Schema {
  schema_name: string;
}

export default async function Home() {
  const { data: schemas, error } = await supabase
    .from('information_schema.schemata')
    .select('schema_name');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Hello World</h1>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      {schemas && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Supabase Connection Verified!</h2>
          <p className="mb-2">The following schemas were found:</p>
          <ul className="list-disc list-inside bg-gray-100 p-4 rounded">
            {schemas.map((schema: Schema) => (
              <li key={schema.schema_name}>{schema.schema_name}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}


