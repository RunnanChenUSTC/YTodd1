import pool from '../../lib/db';
import { NextRequest, NextResponse } from "next/server";
// Import necessary modules and types
//import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';
import mysql2 from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if the request method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const connectionConfig = {
    host: 'mysqlserverless.cluster-cautknyafblq.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: '35nPQH!ut;anvcA',
    database: 'GPT_experiment',
  };

  try {
    // const connection = await mysql2.createConnection(connectionConfig);
    const connection = await pool.getConnection();
    const { action, ...data } = req.body;
    try {
      if (action === 'insertInteraction') {
        const { UserID, ButtonName, UserLogTime, GPTMessages, Note, QuestionID, MsgIdentifier, SpecialNote} = data;
        const query = 'INSERT INTO user_log_UMN (UserID, ButtonName, UserLogTime, GPTMessages, Note, QuestionID, MsgIdentifier, SpecialNote) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const params = [UserID, ButtonName, UserLogTime, GPTMessages, Note, QuestionID || null, MsgIdentifier || null, SpecialNote || null];
        const [result] = await connection.execute<mysql2.ResultSetHeader>(
          query, params
        );
        
        if (result.affectedRows > 0) {
          const [rows] = await connection.execute<RowDataPacket[]>(
            'SELECT LAST_INSERT_ID() AS UserLogID'
          );

          if (rows.length > 0) {
            const { UserLogID } = rows[0];
            res.status(200).json({ success: true, message: 'Data inserted successfully', UserLogID });
          } else {
            throw new Error('Failed to retrieve UserLogID');
          }
        } else {
          throw new Error('Failed to insert data');
        }
        
      } else if (action === 'fetchUserID') {
        const { username } = data;
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT UserID FROM user_UMN WHERE UserName = ?', [username]
        );

        if (rows.length > 0) {
          const { UserID } = rows[0];
          res.status(200).json({ success: true, UserID });
        } else {
          res.status(404).json({ success: false, message: 'User not found' });
        }
      } else if (action === 'updateMsgId') {
        const { UserLogID, MsgIdentifier } = data;
        const updateQuery = `
          UPDATE user_log_UMN
          SET MsgIdentifier = ?
          WHERE UserLogID = ?
        `;
        const params = [MsgIdentifier, UserLogID];
        const [updateResult] = await connection.execute<mysql2.ResultSetHeader>(updateQuery, params);

        if (updateResult.affectedRows > 0) {
          res.status(200).json({ success: true, message: 'MsgId updated successfully' });
        } else {
          throw new Error('Failed to update MsgId');
        }
      } else {
        res.status(400).json({ message: 'Invalid action' });
      }
  } finally {
    // 确保释放连接
    connection.release();
  }
  } catch (error) {
    console.error('Database connection or query failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
