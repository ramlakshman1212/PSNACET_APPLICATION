import pg from 'pg';

const client = new pg.Client({ connectionString: 'postgres://webadmin:MAPlqk90284@node276505-admissionspsna.in1.cloudlets.co.in:5432/psnacet_admissions' });

client.connect().then(() => {
  return client.query("ALTER TABLE students ALTER COLUMN date_of_birth DROP NOT NULL;");
}).then(() => {
  console.log('Column altered successfully');
  process.exit(0);
}).catch(e => {
  console.log(e.message);
  process.exit(1);
});
