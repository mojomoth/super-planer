// SSRF guard self-check (no network needed: every target here must be refused before or at connect time).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedIp, fetchPreview, parseMeta } from './preview.ts';

test('isBlockedIp rejects private, loopback, link-local, CGNAT, metadata, v6 local', () => {
  for (const ip of [
    '127.0.0.1', '10.0.0.5', '172.16.3.4', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1',
    '100.100.100.200', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd00:ec2::254', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.0.0.1', '64:ff9b::a9fe:a9fe', '64:ff9b::7f00:1', 'ff02::1',
    'not-an-ip',
  ]) assert.equal(isBlockedIp(ip), true, ip);
  for (const ip of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '100.128.0.1', '2606:4700:4700::1111', '64:ff9b::14c8:f5f7', '::ffff:8.8.8.8']) {
    assert.equal(isBlockedIp(ip), false, ip);
  }
});

test('fetchPreview refuses blocked targets', async () => {
  for (const url of [
    'http://127.0.0.1/',
    'http://localhost:80/',
    'http://localhost/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://169.254.169.254/latest/meta-data/',
    'http://0x7f000001/',
    'http://2130706433/',
    'http://10.1.2.3/',
    'http://example.com:3102/',
    'http://user:pw@example.com/',
    'file:///etc/passwd',
    'ftp://example.com/',
  ]) {
    await assert.rejects(fetchPreview(url), Error, url);
  }
});

test('parseMeta reads og tags, entities and resolves relative images', () => {
  const html = `<html><head><title>Fallback</title>
    <meta property="og:title" content="Rogue &amp; Friends">
    <meta name="description" content='짧은 설명'>
    <meta property="og:image" content="/img/cover.png">
    <meta property="og:site_name" content="Wiki"></head></html>`;
  assert.deepEqual(parseMeta(html, new URL('https://example.com/a/b')), {
    title: 'Rogue & Friends',
    description: '짧은 설명',
    image: 'https://example.com/img/cover.png',
    site: 'Wiki',
  });
  const bare = parseMeta('<title>Only title</title><meta property="og:image" content="javascript:alert(1)">', new URL('https://www.x.org/'));
  assert.deepEqual(bare, { title: 'Only title', description: null, image: null, site: 'x.org' });
});
