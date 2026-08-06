# Segurança

- Nunca commite `.env` ou variantes; apenas `.env.example`, sem valores reais.
- Nunca inclua token, senha, credencial de tenant ou dado pessoal real em
  código, teste, exemplo de documentação ou mensagem de commit.
- O access token vive somente em memória, no store de sessão. Não persista em
  `localStorage`, `sessionStorage` nem cookie legível por JavaScript.
- O refresh token é responsabilidade do cookie HttpOnly emitido pelo backend. O
  frontend não o lê nem o replica.
- Só use `credentials: 'include'` nas rotas que dependem do cookie de sessão
  (login, refresh, logout). O padrão é `'omit'`.
- Variáveis `NEXT_PUBLIC_*` são públicas por definição: não coloque segredo
  nelas.
- Não renderize HTML vindo do backend sem sanitização; evite
  `dangerouslySetInnerHTML`.
- Permissão exibida na interface é conveniência, não controle: a autorização
  real é do backend. Não esconda uma verificação assumindo que a tela já filtrou.
- A área `/interno` é do superadmin e usa sessão separada; não reaproveite
  token, cliente HTTP ou guarda de rota entre as duas áreas.
