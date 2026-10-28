# Living Room OS: produto, arquitetura e roadmap

> Objetivo: transformar o Free My TV numa home de sala de estar pessoal, rápida e útil para duas pessoas, com descoberta de filmes e séries, calendário familiar e atalhos para assistir. A primeira regra é respeitar a TV: manter o launcher original recuperável e nunca assumir que o Android permite ler dados privados de outros serviços.

## Decisões de produto

1. **Uma home, dois contextos pessoais.** Experiência partilhada para a sala, mas com gostos, listas e feedback identificáveis como “Guiga”, “Rê” ou “Nós dois”. Não exigir conta nem backend pago no primeiro ciclo.
2. **Descoberta acima de quantidade.** Mostrar de 3 a 5 escolhas com justificativa, filtros de humor/tempo e disponibilidade no Brasil, em vez de um feed infinito.
3. **Catálogo primeiro, histórico depois.** Reusar a integração TMDB existente para títulos, posters, gêneros, nota TMDB e provedores brasileiros. IMDb e Rotten Tomatoes só quando uma fonte autorizada e estável disponibilizar esses dados; não raspar sites nem exibir números presumidos.
4. **Controlo explícito de dados.** Histórico assistido, avaliações e preferências são locais e voluntários. A leitura de histórico entre Netflix, Prime Video, Disney+ e outros não é universalmente exposta ao launcher Android. O sistema deve explicar esse limite e nunca fingir que observou algo que não consegue acessar.
5. **Privacidade por padrão.** O widget familiar recebe apenas títulos e horários do feed de leitura pública previamente compartilhado. Nunca incluir recados privados, descrição, convidados, local ou tokens no APK/logs.
6. **Sem paywall para o básico.** Usar APIs gratuitas dentro dos seus limites, cache local e integração existente. Serviços opcionais só entram quando há vantagem clara e custo conhecido.

## A experiência desejada

### Home
- Linha hero de descoberta com poster/backdrop, nota TMDB identificada como tal, gênero, duração/ano e onde assistir no Brasil quando a fonte confirmar.
- Trilhas curtas: “Para vocês dois”, “Aclamados”, “Documentários”, “Uma sessão de até 90 min”, “Continuar descobrindo” e “Sua lista”.
- Ações de controlo remoto com foco previsível: abrir app/título quando um deep link confiável existe; caso contrário abrir o app e identificar a limitação sem inventar destino.
- Cartão de agenda compacto, com atualização de rede resiliente, sem sacrificar a fluidez do launcher.
- Modo “Noite de filme”: encontrar opções para o tempo disponível e preferências combinadas. Não ativar automações de casa que não foram configuradas.

### Perfil de gosto partilhado
- Feedback com quatro ações: gostei, não gostei, já assisti, guardar.
- Preferências opcionais por perfil e em conjunto; filtros para conteúdo infantil, animação, terror, idioma, duração e documentários.
- Recomendações explicáveis: “sugerido porque vocês guardaram X e escolheram documentários”, nunca “porque assistiram a X” sem evidência de histórico.

### App complementar
- Uma página leve para telefone, acessível na rede local ou hospedada gratuitamente, para gerir lista, votar entre duas opções e enviar um título para a TV.
- QR code na TV pode abrir a página, mas o emparelhamento deve ter código temporário e nunca expor tokens.
- Sincronização remota, se vier a existir, deve ser opt-in. A primeira versão pode manter lista no dispositivo para evitar custos e contas.

## Arquitetura escolhida

- **Launcher Android/Google TV:** interface, foco de D-pad, launching de apps e cache. Reusar o estilo/renderer atual e manter trabalho de rede fora da thread visual.
- **TMDB:** catálogo, gêneros, artwork, avaliação TMDB e provedores de streaming por região. Região padrão de produto: BR.
- **IMDb / Rotten Tomatoes:** não acoplar UI à fonte até confirmar licença, API, cobertura e regras de exibição. Se a fonte não existir, esconder o selo em vez de substituir ou estimar nota.
- **Painel Casa:** endpoint público de agenda com os campos mínimos já documentados; cabeçalhos no-cache no cliente, timeout, refresh moderado e última resposta válida.
- **Armazenamento:** SharedPreferences/JSON local versionado e exportável. Nada de login na primeira versão.
- **Qualidade:** CI para APK e web; artifact de teste identificado como teste; release estável separada; feature flags para recursos que ainda não foram testados na Philips.

## Limites reais / não prometer

- Não existe um mecanismo público universal que entregue o histórico de exibição de todos os apps de streaming instalados no Google TV.
- A presença de um app instalado não garante assinatura ativa.
- Uma disponibilidade de streaming no catálogo pode estar desatualizada; mostrar a fonte/região e permitir abrir o serviço sem alegar certeza absoluta.
- Não exibir notas IMDb ou Rotten Tomatoes a partir de scraping. Confirmar API/termos e atribuição antes da implementação.
- Google TV pode expor intents/deep links apenas em determinadas apps/títulos; usar fallback seguro para página inicial do app.
- O recurso precisa continuar utilizável mesmo sem rede ou com API indisponível.

## Roadmap

### P0 · Base segura
- [ ] Auditar e consolidar as PRs de calendário. Confirmar CI, eliminar duplicação e preservar o teste que já está funcionando.
- [ ] Verificar estado vazio versus erro/transiente no endpoint; não apagar última resposta válida numa falha.
- [ ] Confirmar datas e horários no fuso local de exibição.
- [ ] Registrar processo de instalação, rollback e artefatos de teste/estáveis.

### P1 · Descoberta inteligente
- [ ] Usar região BR e idioma pt-BR no catálogo.
- [ ] Melhorar filtros: filmes/séries/documentários, gênero, duração e década.
- [ ] Exibir claramente a nota TMDB e provedores confirmados.
- [ ] Busca por título e página de detalhes com metadados essenciais.
- [ ] Lista local “Quero ver”, persistente após reiniciar.

### P2 · Escolher em casal
- [ ] Votação local “Eu / Você / Nós dois”.
- [ ] Preferências simples e explicação das sugestões.
- [ ] Botão “surpreenda-nos” com filtros e opção de nova rodada.
- [ ] Resumo de duração para sessão curta/média/longa.

### P3 · Controlo e integração
- [ ] Deep links testados por app, com fallback.
- [ ] Companion web para telefone e QR temporário.
- [ ] Google Calendar read-only com escopo mínimo, se o fluxo existente continuar simples e seguro.
- [ ] Só explorar controles de casa após inventário de dispositivos e confirmações de compatibilidade.

## Critérios de lançamento

- CI verde para as duas plataformas de build aplicáveis.
- Testado na Philips 65PUG7406/78, Android TV 11, por pelo menos um ciclo de ligar/desligar e navegação com controle.
- Foco remoto sem saltos, home sem travar durante chamadas de rede e cache funcional offline.
- A agenda mostra novos eventos depois de atualização e mantém dados válidos em falha temporária.
- O launcher original continua restaurável e a versão modificada não substitui o launcher padrão sem validação manual.
- Nenhuma credencial, histórico privado ou informação sensível adicionada ao repositório.

## Próxima decisão técnica

Não começar reescrevendo o launcher inteiro. Primeiro concluir a camada de catálogo existente e o fluxo de agenda com testes. Em seguida, adicionar lista local e filtros em etapas pequenas, cada uma com CI e APK de teste. A instalação permanente só acontece depois de teste real na Philips.
