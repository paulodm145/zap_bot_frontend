'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { useCep,useCompany,useSaveCompany } from '@/hooks/tenant/use-company';
import { useMe } from '@/hooks/tenant/use-me';
import { useDebouncedValue } from '@/hooks/common/use-debounced-value';
import { isApiError } from '@/lib/api/api-error';
import styles from './tenant.module.css';

const digits=(v:string,n:number)=>v.replace(/\D/g,'').slice(0,n);
const maskCep=(v:string)=>digits(v,8).replace(/(\d{5})(\d)/,'$1-$2');
const maskCnpj=(v:string)=>digits(v,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
const maskPhone=(v:string)=>{const d=digits(v,13);return d.startsWith('55')?d.replace(/(\d{2})(\d{2})(\d{5})(\d{0,4})/,'+$1 ($2) $3-$4'):d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3')};
const fields=[['razaoSocial','Razão social','razao_social'],['nomeFantasia','Nome fantasia','nome_fantasia'],['cnpj','CNPJ','cnpj'],['email','E-mail','email'],['telefone','Telefone','telefone'],['site','Site','site'],['cep','CEP','cep'],['logradouro','Logradouro','logradouro'],['numero','Número','numero'],['complemento','Complemento','complemento'],['bairro','Bairro','bairro'],['municipio','Município','municipio'],['uf','UF','uf']] as const;

export function CompanyView(){
  const company=useCompany(),me=useMe(),save=useSaveCompany();
  const[values,setValues]=useState<Record<string,string>>({});
  const rawCep=values.cep??String(company.data?.cep??'');
  const cep=useCep(useDebouncedValue(rawCep,500));
  if(company.isLoading)return <AppShell title="Dados da empresa"><div className={styles.state}>Carregando...</div></AppShell>;
  const canSave=me.data?.papel==='ADMIN_TENANT';
  const suggestions:Record<string,string>=cep.data?{cep:cep.data.cep,uf:cep.data.uf,municipio:cep.data.municipio,bairro:cep.data.bairro,logradouro:cep.data.logradouro}:{};
  function value(key:string,read:string){const raw=values[key]??suggestions[key]??String(company.data?.[read as keyof NonNullable<typeof company.data>]??'');return key==='cnpj'?maskCnpj(raw):key==='telefone'?maskPhone(raw):key==='cep'?maskCep(raw):raw}
  function change(key:string,input:string){const formatted=key==='cnpj'?maskCnpj(input):key==='telefone'?maskPhone(input):key==='cep'?maskCep(input):input;setValues(v=>({...v,[key]:formatted}))}
  const error=company.error??save.error??cep.error;
  return <AppShell title="Dados da empresa" subtitle="Identificação, contato e endereço do tenant."><section className={styles.card}><form className={styles.form} onSubmit={e=>{e.preventDefault();save.mutate({...suggestions,...values})}}><div className={styles.grid}>{fields.map(([key,label,read])=><label key={key}>{label}<input value={value(key,read)} inputMode={key==='cnpj'||key==='telefone'||key==='cep'?'numeric':undefined} disabled={!canSave} onChange={e=>change(key,e.target.value)}/>{key==='cep'&&cep.isFetching&&<small>Buscando endereço...</small>}</label>)}</div>{error&&<div className={styles.error}>{isApiError(error)?error.message:'Não foi possível concluir.'}</div>}{canSave&&<div className={styles.actions}><Button disabled={save.isPending}>Salvar dados</Button></div>}</form></section></AppShell>;
}
